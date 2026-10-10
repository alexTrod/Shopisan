#!/usr/bin/env node
/**
 * Read-only audit of city names (client feedback point 5: "Toujouse").
 *
 * Lists every city in `cities` and every distinct `cityName` on `stores`,
 * and flags names that are probably the same place spelled differently
 * (accent/case variants, or within 2 edits of a better-attested name).
 * Writes nothing. The output is the input for a reviewed cleanup.
 *
 * Usage:
 *   node scripts/audit-city-names.mjs            # production (serviceAccountKey.json)
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node scripts/audit-city-names.mjs
 */

import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.env.FIRESTORE_EMULATOR_HOST) {
  admin.initializeApp({ projectId: "shopisan-bad76" });
} else {
  const key = path.join(root, "serviceAccountKey.json");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(key, "utf8"))) });
}
const db = admin.firestore();

const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const [citiesSnap, storesSnap] = await Promise.all([db.collection("cities").get(), db.collection("stores").get()]);

// name -> { cityDocs: [...ids], stores: count }
const names = new Map();
const entry = (n) => names.get(n) || names.set(n, { cityDocs: [], stores: 0 }).get(n);
for (const d of citiesSnap.docs) {
  const n = d.data().name?.fr || d.data().name?.en;
  if (n) entry(n).cityDocs.push(d.id);
}
for (const d of storesSnap.docs) {
  const s = d.data();
  if (s.deleted_at) continue;
  const n = s.cityName || s.address?.[0]?.location?.city?.name;
  if (n) entry(n).stores++;
}

const list = [...names.entries()].map(([name, v]) => ({ name, key: fold(name), ...v }));
const weight = (x) => x.stores * 10 + x.cityDocs.length;

const suspects = [];
for (const a of list) {
  for (const b of list) {
    if (a === b || weight(a) > weight(b) || (weight(a) === weight(b) && a.name >= b.name)) continue;
    const same = a.key === b.key;
    const dist = distance(a.key, b.key);
    if (same || (dist <= 2 && Math.min(a.key.length, b.key.length) >= 5)) {
      suspects.push({ probablyWrong: a.name, probablyRight: b.name, editDistance: dist, wrongStores: a.stores, wrongCityDocs: a.cityDocs.join(",") });
    }
  }
}

console.log(`${citiesSnap.size} city docs, ${list.length} distinct names (cities + store cityName).\n`);
console.table(suspects.sort((x, y) => x.editDistance - y.editDistance));
console.log("\nAll names (stores, city docs):");
for (const x of list.sort((a, b) => a.name.localeCompare(b.name))) console.log(`  ${x.name.padEnd(28)} ${String(x.stores).padStart(3)} stores  ${x.cityDocs.length} city docs`);
process.exit(0);
