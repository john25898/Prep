/**
 * Regenerates `data/khis-ou-ward-map.json` — a compact `{ facilityUid: wardName }`
 * lookup used by `lib/partners.ts` to fill in the Ward column for roster rows
 * whose extracted `ward` field accidentally contains the facility UID.
 *
 * The source of truth is the KHIS org-unit registry dump kept OUTSIDE this repo
 * (`dictionaries/khis_org_units.json` in the parent workspace). The deployment
 * must not depend on that file, which is why the trimmed map is committed.
 *
 * Usage:  node scripts/build-ward-map.cjs [path/to/khis_org_units.json]
 */
const fs = require("fs");
const path = require("path");

const repo = path.join(__dirname, "..");
const source =
  process.argv[2] ||
  path.join(
    repo,
    "..",
    "..",
    "dictionaries",
    "khis_org_units.json",
  );

if (!fs.existsSync(source)) {
  console.error(`Source org-unit dump not found: ${source}`);
  console.error(
    "Pass the path explicitly: node scripts/build-ward-map.cjs <path-to-khis_org_units.json>",
  );
  process.exit(1);
}

const org = JSON.parse(fs.readFileSync(source, "utf8"));
const byId = new Map();
for (const ou of org) {
  if (ou && ou.id && ou.ward) byId.set(ou.id, ou.ward);
}
console.log(`org units: ${org.length} (with a ward: ${byId.size})`);

const rosterDir = path.join(repo, "data");
const uids = new Set();
for (const file of fs.readdirSync(rosterDir)) {
  if (!/-facilities\.json$/.test(file)) continue;
  const rows = JSON.parse(fs.readFileSync(path.join(rosterDir, file), "utf8"));
  for (const f of rows) if (f && f.uid) uids.add(f.uid);
}
console.log(`roster facility uids: ${uids.size}`);

const out = {};
for (const uid of uids) {
  const ward = byId.get(uid);
  if (ward) out[uid] = ward;
}

const dest = path.join(rosterDir, "khis-ou-ward-map.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`mapped: ${Object.keys(out).length} -> ${dest}`);
