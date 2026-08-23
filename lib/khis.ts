// ---------------------------------------------------------------------------
// KHIS client (national KHIS: https://hiskenya.dha.go.ke/api)
//
// SERVER-ONLY module. Never import from client components — credentials must
// stay on the server. Use the /api/khis route handler instead.
//
// Credentials come from env (see .env.example):
//   KHIS_BASE_URL, KHIS_USERNAME, KHIS_PASSWORD
//
// NOTE: This module talks to KHIS with Basic auth — only ever call it from
// route handlers / server code. Never import it into a "use client" file.
// ---------------------------------------------------------------------------

export const KHIS_BASE_URL =
  process.env.KHIS_BASE_URL ?? "https://hiskenya.dha.go.ke/api";

const KHIS_USERNAME = process.env.KHIS_USERNAME ?? "rgngumo";
const KHIS_PASSWORD = process.env.KHIS_PASSWORD ?? "Advisorychak123!!";

export interface KhisRow {
  dx: string;
  dxName: string;
  period: string;
  periodName: string;
  ou: string;
  ouName: string;
  value: number | null;
}

export interface KhisAnalytics {
  rows: KhisRow[];
  /** Raw KHIS metadata items (id -> {name}). */
  meta: Record<string, { name: string }>;
  requested: { dx: string[]; pe: string; ou: string[] };
}

/** Basic-auth header value. */
function authHeader(): string {
  return (
    "Basic " +
    Buffer.from(`${KHIS_USERNAME}:${KHIS_PASSWORD}`).toString("base64")
  );
}

/**
 * Calls DHIS2 analytics.json with dx / pe / ou dimensions.
 * `ou` can be one or many org-unit UIDs (join multiple with ";").
 */
export async function khisAnalytics(
  dxIds: string[],
  pe: string,
  ouIds: string[],
): Promise<KhisAnalytics> {
  const url = new URL(`${KHIS_BASE_URL.replace(/\/$/, "")}/analytics.json`);
  // NOTE: use append() — set() would REPLACE the previous "dimension" value,
  // leaving only the last dimension (ou) in the request, which DHIS2 rejects
  // with HTTP 409 Conflict.
  url.searchParams.append("dimension", `dx:${dxIds.join(";")}`);
  url.searchParams.append("dimension", `pe:${pe}`);
  url.searchParams.append("dimension", `ou:${ouIds.join(";")}`);
  url.searchParams.append("displayProperty", "NAME");
  url.searchParams.append("skipData", "false");

  // KHIS sits behind a Cloudflare proxy that frequently drops the FIRST
  // connection (connect timeouts / 520s). Retry with backoff so live dashboards
  // don't show spurious errors during demos.
  let res: Response | undefined;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      res = await fetch(url.toString(), {
        headers: { Authorization: authHeader(), Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(120_000),
      });
      if (res.ok) break;
      // Retry transient gateway errors (502/503/504/520), fail fast on 4xx.
      if (res.status < 500 && res.status !== 408) {
        lastErr = new Error(
          `KHIS analytics failed: HTTP ${res.status} ${res.statusText}`,
        );
        break;
      }
      lastErr = new Error(
        `KHIS analytics failed: HTTP ${res.status} ${res.statusText}`,
      );
      res = undefined;
    } catch (e) {
      lastErr = e;
      res = undefined;
    }
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  if (!res) {
    throw lastErr instanceof Error
      ? lastErr
      : new Error(`KHIS analytics failed: ${String(lastErr)}`);
  }

  const data = (await res.json()) as {
    headers: { name: string }[];
    rows: string[][];
    metaData?: { items?: Record<string, { name?: string }> };
  };

  const headers = data.headers.map((h) => h.name);
  // DHIS2 analytics headers: name = "dx" | "pe" | "ou" | "value"
  // (the "column" field is the human label: Data / Period / Organisation unit / Value).
  const idxDx = headers.indexOf("dx");
  const idxPe = headers.indexOf("pe");
  const idxOu = headers.indexOf("ou");
  const idxVal = headers.indexOf("value");
  if (idxDx < 0 || idxPe < 0 || idxOu < 0 || idxVal < 0) {
    throw new Error(`Unexpected analytics headers: ${JSON.stringify(headers)}`);
  }

  const rows: KhisRow[] = (data.rows ?? []).map((r) => ({
    dx: r[idxDx] ?? "",
    dxName: data.metaData?.items?.[r[idxDx]]?.name ?? r[idxDx],
    period: r[idxPe] ?? "",
    periodName: data.metaData?.items?.[r[idxPe]]?.name ?? r[idxPe],
    ou: r[idxOu] ?? "",
    ouName: data.metaData?.items?.[r[idxOu]]?.name ?? r[idxOu],
    value: r[idxVal] === "" || r[idxVal] == null ? null : Number(r[idxVal]),
  }));

  return {
    rows,
    meta: (data.metaData?.items as Record<string, { name: string }>) ?? {},
    requested: { dx: dxIds, pe, ou: ouIds },
  };
}

/**
 * Runs analytics for large org-unit sets by chunking the `ou:` dimension.
 *
 * KHIS (behind a proxy) rejects URLs that get too long — a single request
 * with 300+ facility UIDs fails with HTTP 520. Splitting the org units into
 * chunks (default 120) keeps each URL well under the limit while preserving
 * the exact same row-level results.
 */
export async function khisAnalyticsChunked(
  dxIds: string[],
  pe: string,
  ouIds: string[],
  chunkSize = 120,
): Promise<KhisAnalytics> {
  if (ouIds.length <= chunkSize) {
    return khisAnalytics(dxIds, pe, ouIds);
  }

  const chunks: string[][] = [];
  for (let i = 0; i < ouIds.length; i += chunkSize) {
    chunks.push(ouIds.slice(i, i + chunkSize));
  }

  // Fire chunks sequentially to be gentle on KHIS (parallel bursts of large
  // queries tend to trigger rate limits / proxy errors).
  const results: KhisAnalytics[] = [];
  for (const chunk of chunks) {
    results.push(await khisAnalytics(dxIds, pe, chunk));
  }

  const rows = results.flatMap((r) => r.rows);
  const meta: Record<string, { name: string }> = {};
  for (const r of results) Object.assign(meta, r.meta);

  return {
    rows,
    meta,
    requested: { dx: dxIds, pe, ou: ouIds },
  };
}

/**
 * Sums a row set for a dx id — optionally filtered to a single period.
 * Returns null when there is no data at all.
 */
export function sumFor(
  rows: KhisRow[],
  dx: string,
  pe?: string,
): number | null {
  const hits = rows.filter(
    (r) => r.dx === dx && (!pe || r.period === pe) && r.value != null,
  );
  if (hits.length === 0) return null;
  return hits.reduce((acc, r) => acc + (r.value ?? 0), 0);
}

/** Sums across multiple dx ids (used to compose a cascade stage). */
export function sumAcross(
  rows: KhisRow[],
  dxIds: string[],
  pe?: string,
): number | null {
  let total = 0;
  let any = false;
  for (const dx of dxIds) {
    const v = sumFor(rows, dx, pe);
    if (v != null) {
      total += v;
      any = true;
    }
  }
  return any ? total : null;
}
