// Probe v4 — group-disaggregated PrEP elements + facility-level dataValueSets.
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

// Group-level PrEP elements (members of the MOH 731 PLUS PrEP tool)
const GROUPS = {
  elig_gp: "TmJeb0ttJXO",
  elig_fsw: "GK5eHJVjf45",
  elig_msm: "RAxC6dok0ZU",
  elig_pwid: "N9v5DeqnxRo",
  elig_dc: "d5oDbyxUZNw",
  cur_gp: "SvUs6rPKruy",
  cur_fsw: "DWOXcLFInzC",
  cur_msm: "eUXDNCzAWO7",
  cur_pwid: "uJGBLoQwCb4",
  cur_dc: "Tikx6x3xghp",
  ref_gp: "w6bbU6qwRLF",
  ref_fsw: "Mc8JPUVVMfD",
  ref_msm: "RwRT4W7fdzz",
  ref_pwid: "hZxuehBbUcT",
  ref_dc: "qBAWpz9z1CA",
};
const nameOf = (uid) =>
  Object.entries(GROUPS).find(([, u]) => u === uid)?.[0] ?? uid;
const all = Object.values(GROUPS).join(";");

console.log(
  "== GROUP-LEVEL PrEP analytics (national + Embu + Mombasa, 202505) ==",
);
const PES = ["202505"];
for (const [nm, ou] of [
  ["NATIONAL", "LEVEL-1"],
  ["Embu", "PFu8alU2KWG"],
  ["Mombasa", "wsBsC6gjHvn"],
]) {
  const sp = new URLSearchParams();
  sp.append("dimension", `dx:${all}`);
  sp.append("dimension", `pe:${PES.join(";")}`);
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
  if (status !== 200) console.log("     ", JSON.stringify(body).slice(0, 200));
}

// Facility-level dataValueSets — find a facility that reported PrEP New for 202505, then read its raw values
console.log("\n== FACILITY dataValueSets (MOH 731 PLUS PrEP tool) ==");
const sp = new URLSearchParams();
sp.append("dimension", "dx:MJ6BGiWLAeM");
sp.append("dimension", "pe:202505");
sp.append("dimension", "ou:LEVEL-4");
const { status, body } = await j(`/analytics.json?${sp.toString()}&pageSize=5`);
const rows = body?.rows ?? [];
console.log(
  `  facilities with PrEP New 202505: HTTP ${status} rows=${rows.length}`,
);
for (const r of rows.slice(0, 5)) console.log("     ou:", r[2], "value:", r[3]);
const facUid = rows[0]?.[2];
if (facUid) {
  for (const [tag, dsId] of [
    ["facility", "A01SsXzNsbD"],
    ["dice", "zxyaWpqkTlP"],
  ]) {
    const { status: s2, body: b2 } = await j(
      `/dataValueSets.json?dataSet=${dsId}&orgUnit=${facUid}&period=202505&paging=false`,
    );
    const dvs = b2?.dataValues ?? [];
    console.log(
      `  ${tag} [${dsId}] ${facUid}: HTTP ${s2}, values=${dvs.length}`,
    );
    const names = new Map();
    for (const v of dvs.slice(0, 30)) {
      if (!names.has(v.dataElement)) {
        const m = await j(`/dataElements/${v.dataElement}?fields=id,name`);
        names.set(v.dataElement, m.body?.name ?? v.dataElement);
      }
      console.log("     ", names.get(v.dataElement), "=", v.value);
    }
  }
}

// Resolve real KHIS metadata names for the 15 group-level elements
console.log("\n== GROUP ELEMENT NAMES ==");
for (const [key, uid] of Object.entries(GROUPS)) {
  const m = await j(`/dataElements/${uid}?fields=id,name`);
  console.log("  ", key, "|", uid, "|", m.body?.name ?? `HTTP ${m.status}`);
}
