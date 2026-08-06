#!/usr/bin/env node
/**
 * Grant or remove a store's verification badge.
 *
 * Usage:
 *   node scripts/verify-store.js <storeId>
 *   node scripts/verify-store.js <storeId> --unverify
 *   node scripts/verify-store.js <storeId> --dry-run
 *
 * <storeId> is either the Firestore document id or the numeric store.id.
 *
 * Requires: serviceAccountKey.json in project root
 *
 * Verification is the Twitter-style badge, not a visibility gate: an unverified
 * store is fully live on the map, in listings and in search. The badge only
 * adds a public trust signal and ranks the store above unverified ones in
 * search suggestions.
 *
 * firestore.rules makes is_verified server-owned, so this must run through the
 * Admin SDK -- a merchant cannot grant it to themselves from the app.
 *
 * Setting is_verified false -> true fires the onStoreVerified Cloud Function,
 * which emails the owner. Re-verifying an already-verified store is a no-op and
 * sends nothing.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const UNVERIFY = args.includes("--unverify");
const storeIdArg = args.find((a) => !a.startsWith("--"));

if (!storeIdArg) {
  console.error(`
ERROR: no store id given.

Usage:
  node scripts/verify-store.js <storeId>
  node scripts/verify-store.js <storeId> --unverify
`);
  process.exit(1);
}

const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`
ERROR: Service account key not found at ${serviceAccountPath}

To fix:
1. Go to: https://console.firebase.google.com/project/shopisan-bad76/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Save as serviceAccountKey.json in project root
`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "shopisan-bad76",
});

const db = admin.firestore();

/**
 * Resolve either a Firestore document id or the numeric store.id. Both are in
 * circulation: posts and deep links reference the numeric id, everything else
 * uses the document id.
 */
async function findStore(identifier) {
  const byDocId = await db.collection("stores").doc(identifier).get();
  if (byDocId.exists) return byDocId;

  const numeric = Number(identifier);
  if (!Number.isNaN(numeric)) {
    const byField = await db
      .collection("stores")
      .where("id", "==", numeric)
      .limit(2)
      .get();
    if (byField.size > 1) {
      throw new Error(
        `Ambiguous: ${byField.size} stores share id ${numeric}. Pass a document id instead.`,
      );
    }
    if (byField.size === 1) return byField.docs[0];
  }

  return null;
}

async function main() {
  const docSnap = await findStore(storeIdArg);
  if (!docSnap) {
    console.error(`ERROR: no store found for "${storeIdArg}"`);
    process.exit(1);
  }

  const store = docSnap.data();
  const alreadyVerified = store.is_verified === true;

  console.log("=".repeat(60));
  console.log(
    UNVERIFY ? "REMOVE VERIFICATION BADGE" : "GRANT VERIFICATION BADGE",
  );
  console.log("=".repeat(60));
  console.log(`  document:    ${docSnap.id}`);
  console.log(`  store.id:    ${store.id}`);
  console.log(`  name:        ${store.name}`);
  console.log(`  owner_id:    ${store.owner_id}`);
  console.log(`  is_verified: ${store.is_verified} -> ${!UNVERIFY}`);

  if (store.is_suspended === true && !UNVERIFY) {
    console.error(
      "\nERROR: this store is suspended. Un-suspend it before verifying.",
    );
    process.exit(1);
  }

  if (alreadyVerified === !UNVERIFY) {
    console.log(
      `\nAlready ${UNVERIFY ? "unverified" : "verified"}. Nothing to do.`,
    );
    return;
  }

  if (DRY_RUN) {
    console.log("\n[dry-run] no data changed.");
    return;
  }

  const update = { is_verified: !UNVERIFY };
  update.verifiedAt = UNVERIFY
    ? admin.firestore.FieldValue.delete()
    : admin.firestore.FieldValue.serverTimestamp();

  await docSnap.ref.update(update);

  console.log(`\nDone. Badge ${UNVERIFY ? "removed" : "granted"}.`);
  if (!UNVERIFY) {
    console.log("The owner has been emailed by onStoreVerified.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nFailed:", error.message);
    process.exit(1);
  });
