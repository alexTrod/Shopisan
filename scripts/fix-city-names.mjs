#!/usr/bin/env node
/**
 * Fix city spellings on stores (client feedback point 5), from the audit in
 * scripts/audit-city-names.mjs. Renames only: nothing is ever deleted.
 *
 * - Stores: `cityName` and `address[0].location.city.name` get one spelling
 *   per city: the app's save-time rules (case/space variants, one French name
 *   per city, see CITY_SPELLINGS), and street names saved as a city take the
 *   nearest city (NOT_A_CITY).
 * - City docs: one misspelled doc is renamed (CITY_DOC_RENAMES).
 *
 * Duplicate city docs and test stores are removed by hand in the admin panel
 * (Cities page; Stores → delete, which keeps them in Trash for 30 days).
 * Runs are idempotent: a second run finds nothing left to change.
 *
 * Safety:
 *   - Dry run by default: prints every change, writes nothing.
 *   - --apply first saves a full copy of `stores` and `cities` to
 *     scripts/backups/, then writes only the fields listed above.
 *   - --undo <backup.json> puts back the original fields of every document
 *     the --apply run changed.
 *
 * Usage:
 *   node scripts/fix-city-names.mjs
 *   node scripts/fix-city-names.mjs --apply
 *   node scripts/fix-city-names.mjs --undo scripts/backups/city-names-<time>.json
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node scripts/fix-city-names.mjs --apply
 */

import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const UNDO = args.includes("--undo") ? args[args.indexOf("--undo") + 1] : null;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.env.FIRESTORE_EMULATOR_HOST) {
  admin.initializeApp({ projectId: "shopisan-bad76" });
} else {
  const key = path.join(root, "serviceAccountKey.json");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(key, "utf8"))) });
}
const db = admin.firestore();

// Same rules the app applies on save (src/utils/storeAddress.js
// normalizeCityName): one French spelling per known city, title case for
// names typed all lower or upper case. Keep the two lists in sync.
const fold = (s) =>
  `${s}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const CITY_SPELLINGS = Object.fromEntries(
  [
    ["Bruxelles", ["Brussels", "Brussel", "bxl"]],
    ["Milan", ["Milano"]],
    ["Florence", ["Firenze", "Fienze"]],
    ["Londres", ["London"]],
    ["Rome", ["Roma"]],
    ["Edimbourg", ["Edinburgh"]],
    ["Bologne", ["Bologna"]],
    ["Ravenne", ["Ravenna"]],
    ["Gênes", ["Genova"]],
    ["Gand", ["Gent"]],
    ["Anvers", ["Antwerpen", "Antwerp"]],
    ["Louvain", ["Leuven"]],
    ["Grenade", ["Granada"]],
    ["Mantoue", ["Mantova"]],
    ["Rhode-Saint-Genèse", ["Sint-Genesius-Rode"]],
    ["Watermael-Boitsfort", ["Watermaal-Bosvoorde"]],
    ["Aix-en-Provence", []],
    ["Romans-sur-Isère", []],
    ["Saint-Sébastien-sur-Loire", []],
    ["Les Sables-d'Olonne", ["Les Sables d'Olonnes"]],
    ["Perros-Guirec", []],
  ].flatMap(([name, others]) => [name, ...others].map((o) => [fold(o), name])),
);
const normalizeCityName = (name) => {
  const cleaned = `${name ?? ""}`.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  const known = CITY_SPELLINGS[fold(cleaned)];
  if (known) return known;
  const isSingleCase = cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase();
  if (!isSingleCase) return cleaned;
  return cleaned.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
};

// Street or country names saved as the city. These take the nearest city in
// the cities collection (by the store's coordinates, within 30 km).
const NOT_A_CITY = new Set(
  ["Cheam Common Road", "Corporation Street", "Leith Walk", "Monmouth Street", "Newington", "England"].map(fold),
);
const NEAREST_MAX_KM = 30;

// City docs whose name itself is misspelled.
const CITY_DOC_RENAMES = {
  "Les Sables d'Olonnes": "Les Sables-d'Olonne",
};

const squash = (s) => String(s).trim().replace(/\s+/g, " ");
// Shallow copies only, so Firestore GeoPoints and Timestamps inside the
// address keep their types.
const withAddressCity = (address, name) =>
  address.map((a, i) =>
    i === 0 ? { ...a, location: { ...a.location, city: { ...a.location.city, name } } } : a,
  );

const km = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
let cityPoints = [];
const nearestCity = (point) => {
  if (!(Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude))) return null;
  let best = null;
  for (const c of cityPoints) {
    const d = km(point, c);
    if (d <= NEAREST_MAX_KM && (!best || d < best.d)) best = { name: c.name, d };
  }
  return best?.name ?? null;
};
// `point` is the store's geopoint, used only for names in NOT_A_CITY.
const fixName = (name, point) => {
  if (typeof name !== "string") return name;
  if (NOT_A_CITY.has(fold(name))) return nearestCity(point) ?? name;
  return normalizeCityName(name);
};

if (UNDO) {
  const backup = JSON.parse(fs.readFileSync(UNDO, "utf8"));
  const ops = [];
  for (const c of backup.changed.stores) {
    const ref = db.collection("stores").doc(c.id);
    const s = (await ref.get()).data();
    if (!s) continue;
    const update = {};
    if (c.original.cityName !== undefined) update.cityName = c.original.cityName;
    if (c.original.addressCity !== undefined && s.address?.[0]?.location?.city) {
      update.address = withAddressCity(s.address, c.original.addressCity);
    }
    ops.push((b) => b.update(ref, update));
  }
  for (const c of backup.changed.cities) {
    ops.push((b) => b.update(db.collection("cities").doc(c.id), c.original));
  }
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    ops.slice(i, i + 400).forEach((op) => op(batch));
    await batch.commit();
  }
  console.log(`Restored ${backup.changed.stores.length} stores and ${backup.changed.cities.length} city docs from ${UNDO}.`);
  process.exit(0);
}

const [citiesSnap, storesSnap] = await Promise.all([db.collection("cities").get(), db.collection("stores").get()]);

cityPoints = citiesSnap.docs
  .map((d) => {
    const c = d.data();
    const latitude = Number(c.coordinates?.latitude ?? c.latitude);
    const longitude = Number(c.coordinates?.longitude ?? c.longitude);
    const name = c.name?.fr ?? c.name?.en;
    return name && Number.isFinite(latitude) && Number.isFinite(longitude) ? { name, latitude, longitude } : null;
  })
  .filter(Boolean);

const storeChanges = [];
const unresolved = [];
for (const doc of storesSnap.docs) {
  const s = doc.data();
  const gp = s.address?.[0]?.location?.geopoint;
  const point = gp ? { latitude: Number(gp.latitude), longitude: Number(gp.longitude) } : null;
  const update = {};
  const original = {};
  for (const n of [s.cityName, s.address?.[0]?.location?.city?.name]) {
    if (typeof n === "string" && NOT_A_CITY.has(fold(n)) && fixName(n, point) === n) unresolved.push(`${s.name ?? doc.id}: "${n}"`);
  }
  if (typeof s.cityName === "string" && fixName(s.cityName, point) !== s.cityName) {
    update.cityName = fixName(s.cityName, point);
    original.cityName = s.cityName;
  }
  const addrCity = s.address?.[0]?.location?.city?.name;
  if (typeof addrCity === "string" && fixName(addrCity, point) !== addrCity) {
    update.address = withAddressCity(s.address, fixName(addrCity, point));
    original.addressCity = addrCity;
  }
  if (Object.keys(update).length) {
    const from = s.cityName ?? addrCity;
    const to = update.cityName ?? update.address[0].location.city.name;
    storeChanges.push({ id: doc.id, update, original, label: `${s.name ?? doc.id}: "${from}" → "${to}"` });
  }
}

const cityChanges = [];
for (const doc of citiesSnap.docs) {
  const name = doc.data().name || {};
  const current = name.fr ?? name.en ?? "";
  const to = CITY_DOC_RENAMES[squash(current)];
  if (!to) continue;
  const fixed = Object.fromEntries(Object.entries(name).map(([k, v]) => [k, squash(v) === squash(current) ? to : v]));
  cityChanges.push({ id: doc.id, update: { name: fixed }, original: { name }, label: `city "${current}" → "${to}"` });
}

console.log(`Stores to rename: ${storeChanges.length}`);
for (const c of storeChanges) console.log(`  ${c.label}`);
console.log(`City docs to rename: ${cityChanges.length}`);
for (const c of cityChanges) console.log(`  ${c.label}`);
if (unresolved.length) {
  console.log(`Street/country names with no city within ${NEAREST_MAX_KM} km (left as is): ${new Set(unresolved).size}`);
  for (const u of [...new Set(unresolved)]) console.log(`  ${u}`);
}
console.log("Deleted: nothing (this script never deletes).");

if (!APPLY) {
  console.log("\nDry run, nothing written. Re-run with --apply to write.");
  process.exit(0);
}

const backupDir = path.join(root, "scripts", "backups");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `city-names-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(
  backupFile,
  JSON.stringify(
    {
      takenAt: new Date().toISOString(),
      changed: {
        stores: storeChanges.map(({ id, original }) => ({ id, original })),
        cities: cityChanges.map(({ id, original }) => ({ id, original })),
      },
      // Reference copy for a human; --undo only uses `changed`.
      fullCopy: {
        stores: storesSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
        cities: citiesSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
      },
    },
    null,
    2,
  ),
);
console.log(`\nBackup (full copy of stores + cities): ${backupFile}`);

const ops = [
  ...storeChanges.map((c) => (b) => b.update(db.collection("stores").doc(c.id), c.update)),
  ...cityChanges.map((c) => (b) => b.update(db.collection("cities").doc(c.id), c.update)),
];
for (let i = 0; i < ops.length; i += 400) {
  const batch = db.batch();
  ops.slice(i, i + 400).forEach((op) => op(batch));
  await batch.commit();
}
console.log(`Done: ${storeChanges.length} stores and ${cityChanges.length} city docs renamed.`);
console.log(`Undo: node scripts/fix-city-names.mjs --undo ${path.relative(root, backupFile)}`);
process.exit(0);
