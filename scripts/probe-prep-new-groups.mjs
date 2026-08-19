// Probe v6 — are Initiated (New) / Discontinued / Restarting PrEP also
// reported at the population-group level? (Same treatment as Eligible/
// Refill/Current: sum the 5 groups when the Total column is blank.)
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

const NEW = {
  new_gp: "m5tdPqpqQKa",
  new_fsw: "tvkamFcbjEa",
  new_msm: "cucGQCux2ld",
  new_pwid: "IibqwYumcez",
  new_dc: "TtvO6ol7Kq7",
  new_total: "MJ6BGiWLAeM",
};
const DIS = {
  dis_gp: "R3xxj8DCGNg",
  dis_fsw: "Foz7zB6Amwr",
  dis_msm: "FB9YUSlbLhU",
  dis_pwid: "BA5rdvmvi2a",
  dis_dc: "ixgJAkkClLk",
  dis_total: "lqk13LAxEBO",
};
const RES = {
  res_gp: "gwJU48M51cC",
  res_fsw: "wk2eNipmQIN",
  res_msm: "uCEfdPzYP0Z",
  res_pwid: "OyeFtxZcjfS",
  res_dc: "xnoSiOnTh7h",
  res_total: "mNoLA0JX4S4",
};
const nameOf = (uid) =>
  [...Object.entries(NEW), ...Object.entries(DIS), ...Object.entries(RES)].find(
    ([, u]) => u === uid,
  )?.[0] ?? uid;
const all = [
  ...Object.values(NEW),
  ...Object.values(DIS),
  ...Object.values(RES),
].join(";");

console.log(
  "== GROUP-LEVEL Initiated/Discontinued/Restarting (analytics 202505) ==",
);
for (const [nm, ou] of [
  ["NATIONAL", "LEVEL-1"],
  ["Embu", "PFu8alU2KWG"],
  ["Mombasa", "wsBsC6gjHvn"],
]) {
  const sp = new URLSearchParams();
  sp.append("dimension", `dx:${all}`);
  sp.append("dimension", "pe:202505");
  sp.append("dimension", `ou:${ou}`);
  const { status, body } = await j(`/analytics.json?${sp.toString()}`);
  const rows = body?.rows ?? [];
  const nonZero = rows.filter(
    (r) => r[3] !== "" && r[3] != null && Number(r[3]) !== 0,
  );
  console.log(
    `\n  ${nm} (${ou}): HTTP ${status} rows=${rows.length} nonZero=${nonZero.length}`,
  );
  for (const r of nonZero.slice(0, 40))
    console.log("     ", nameOf(r[0]), "pe=", r[1], "value=", r[3]);
}

// JT roster scope via the app route (same params the prep tab uses).
console.log(
  "\n== APP ROUTE /api/khis — JT roster 202505 (initiated + discontinued groups) ==",
);
const r = await fetch(
  "http://127.0.0.1:3111/api/khis?partner=jamii-tekelezi&pe=202505&indicators=" +
    "prep_new_total,prep_new_gp,prep_new_fsw,prep_new_msm,prep_new_pwid,prep_new_dc," +
    "prep_discontinued_total,prep_discontinued_gp,prep_discontinued_fsw,prep_discontinued_msm," +
    "prep_discontinued_pwid,prep_discontinued_dc",
);
const rt = await r.json();
console.log("  HTTP", r.status);
for (const row of rt.values ?? [])
  console.log(
    "   ",
    row.indicator,
    "=",
    row.value ?? "null",
    row.value != null ? `(${row.value})` : "",
  );
