// Probe v5 — is there an "Assessed/Screened for PrEP" stage at group level?
// If yes, the cascade's first stage can be the sum of the 5 groups, making
// Eligible (71) a logical subset of Assessed — instead of 18 ANC1 seen.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = readFileSync(resolve(".env.local"), "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
const BASE = get("KHIS_BASE_URL") || "https://hiskenya.dha.go.ke/api";
const auth =
  "Basic " +
  Buffer.from(`${get("KHIS_USERNAME")}:${get("KHIS_PASSWORD")}`).toString(
    "base64",
  );

async function j(url) {
  const r = await fetch(BASE + url, {
    headers: { Authorization: auth },
    signal: AbortSignal.timeout(90000),
  });
  const t = await r.text();
  let body;
  try {
    body = JSON.parse(t);
  } catch {
    body = { __raw: t.slice(0, 200) };
  }
  return { status: r.status, body };
}

// 1) All members of the two MOH 731 PLUS PrEP data sets — hunt for
//    Assessed / Screened / Tested / Eligible / Counseled elements.
console.log("== DATASET MEMBERS (MOH 731 PLUS PrEP tool) ==");
for (const [name, uid] of [
  ["FACILITY A01SsXzNsbD", "A01SsXzNsbD"],
  ["DICE zxyaWpqkTlP", "zxyaWpqkTlP"],
]) {
  const { status, body } = await j(
    `/dataSets/${uid}?fields=name,dataSetElements[dataElement[id,name]]`,
  );
  const members = body?.dataSetElements ?? [];
  console.log(`\n${name} (${uid}): HTTP ${status} members=${members.length}`);
  const prEP = members
    .map((m) => m.dataElement)
    .filter((de) => /prEP/i.test(de.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  console.log(`  PrEP-related members (${prEP.length}):`);
  for (const de of prEP) console.log("   ", de.id, "|", de.name);
}

// 2) Global search: any data element with "Assessed" + PrEP-ish name
console.log("\n== SEARCH dataElements: 'Assessed' ==");
for (const q of ["Assessed", "assessed for PrEP", "Screened for PrEP"]) {
  const sp = new URLSearchParams();
  sp.append("filter", `name:ilike:${q}`);
  sp.append("fields", "id,name");
  sp.append("pageSize", "50");
  const { status, body } = await j(`/dataElements.json?${sp.toString()}`);
  const els = body?.dataElements ?? [];
  console.log(`\n  filter '${q}': HTTP ${status} hits=${els.length}`);
  for (const de of els.slice(0, 40)) console.log("    ", de.id, "|", de.name);
}
