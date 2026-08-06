#!/usr/bin/env node
/**
 * Suspend or un-suspend a store (abuse takedown).
 *
 * Usage:
 *   node scripts/suspend-store.js <storeId> --reason="spam listings"
 *   node scripts/suspend-store.js <storeId> --unsuspend
 *   node scripts/suspend-store.js <storeId> --unsuspend --dry-run
 *
 * <storeId> is either the Firestore document id or the numeric store.id.
 *
 * Requires: serviceAccountKey.json in project root
 *
 * A takedown writes TWO fields, always together:
 *
 *   suspend:    { is_suspended: true,  is_validated: false }
 *   un-suspend: { is_suspended: false, is_validated: true  }
 *
 * Current app builds hide the store on is_suspended. App builds released before
 * this change have no concept of that field and hide stores on is_validated
 * instead. Writing only one of the two leaks a suspended store to a whole
 * install cohort, which is why this is a script and not a console edit.
 *
 * Setting is_suspended false -> true fires the onStoreSuspended Cloud Function,
 * which emails the owner a takedown notice. Re-suspending an already-suspended
 * store is a no-op and sends nothing.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const UNSUSPEND = args.includes("--unsuspend");
const reasonArg = args.find((a) => a.startsWith("--reason="));
const REASON = reasonArg ? reasonArg.slice("--reason=".length) : "";
const storeIdArg = args.find((a) => !a.startsWith("--"));

if (!storeIdArg) {
  console.error(`
ERROR: no store id given.

Usage:
  node scripts/suspend-store.js <storeId> --reason="spam listings"
  node scripts/suspend-store.js <storeId> --unsuspend
`);
  process.exit(1);
}

if (!UNSUSPEND && !REASON) {
  console.error(
    'ERROR: --reason="..." is required when suspending, so the takedown is auditable.',
  );
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
  const alreadySuspended = store.is_suspended === true;

  console.log("=".repeat(60));
  console.log(UNSUSPEND ? "UN-SUSPEND STORE" : "SUSPEND STORE");
  console.log("=".repeat(60));
  console.log(`  document:     ${docSnap.id}`);
  console.log(`  store.id:     ${store.id}`);
  console.log(`  name:         ${store.name}`);
  console.log(`  owner_id:     ${store.owner_id}`);
  console.log(`  is_suspended: ${store.is_suspended} -> ${!UNSUSPEND}`);
  console.log(`  is_validated: ${store.is_validated} -> ${UNSUSPEND}`);
  if (REASON) console.log(`  reason:       ${REASON}`);

  if (alreadySuspended === !UNSUSPEND) {
    console.log(
      `\nAlready ${UNSUSPEND ? "un-suspended" : "suspended"}. Nothing to do.`,
    );
    return;
  }

  if (DRY_RUN) {
    console.log("\n[dry-run] no data changed.");
    return;
  }

  const update = {
    is_suspended: !UNSUSPEND,
    // Kept in lockstep so builds that predate is_suspended hide the store too.
    is_validated: UNSUSPEND,
  };
  if (!UNSUSPEND) {
    update.suspendedAt = admin.firestore.FieldValue.serverTimestamp();
    update.suspendedReason = REASON;
  } else {
    update.suspendedAt = admin.firestore.FieldValue.delete();
    update.suspendedReason = admin.firestore.FieldValue.delete();
  }

  await docSnap.ref.update(update);

  console.log(`\nDone. Store ${UNSUSPEND ? "restored" : "suspended"}.`);
  if (!UNSUSPEND) {
    console.log(
      "The owner has been emailed a takedown notice by onStoreSuspended.",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nFailed:", error.message);
    process.exit(1);
  });
