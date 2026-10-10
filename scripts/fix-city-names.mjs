#!/usr/bin/env node
/**
 * Fix city spellings on stores (client feedback point 5), from the audit in
 * scripts/audit-city-names.mjs. Renames only: nothing is ever deleted.
 *
 * - Stores: `cityName` and `address[0].location.city.name` get one spelling
 *   per city (case/space variants and a few typos, see RENAMES).
 * - City docs: one misspelled doc is renamed (CITY_DOC_RENAMES).
 *
 * Left alone on purpose (client decision): the same city under two languages
 * (Brussels/Bruxelles, Milano/Milan, ...), duplicate city docs, and junk test
 * stores ("a", "bddfbfd", street names as city).
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

// Store city spellings to replace, keyed by the name with spaces trimmed and
// collapsed. A name that differs from its key only by spaces is fixed too.
const RENAMES = {
  paris: "Paris",
  PARIS: "Paris",
  toulouse: "Toulouse",
  lyon: "Lyon",
  nancy: "Nancy",
  NANCY: "Nancy",
  caen: "Caen",
  CAEN: "Caen",
  CANNES: "Cannes",
  bordeaux: "Bordeaux",
  rome: "Rome",
  LILLE: "Lille",
  "le havre": "Le Havre",
  "PERROS-GUIREC": "Perros-Guirec",
  pertuis: "Pertuis",
  "aix en provence": "Aix-en-Provence",
  "Aix en Provence": "Aix-en-Provence",
  "Aix-En-Provence": "Aix-en-Provence",
  "Romans sur Isère": "Romans-sur-Isère",
  "saint Sébastien sur Loire": "Saint-Sébastien-sur-Loire",
  Fienze: "Firenze",
  "les sables d’Olonne": "Les Sables-d'Olonne",
};

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
const fixName = (name) => (typeof name === "string" ? RENAMES[squash(name)] ?? squash(name) : name);

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

const storeChanges = [];
for (const doc of storesSnap.docs) {
  const s = doc.data();
  const update = {};
  const original = {};
  if (typeof s.cityName === "string" && fixName(s.cityName) !== s.cityName) {
    update.cityName = fixName(s.cityName);
    original.cityName = s.cityName;
  }
  const addrCity = s.address?.[0]?.location?.city?.name;
  if (typeof addrCity === "string" && fixName(addrCity) !== addrCity) {
    update.address = withAddressCity(s.address, fixName(addrCity));
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
