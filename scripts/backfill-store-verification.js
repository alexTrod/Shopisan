#!/usr/bin/env node
/**
 * Carry store approval status over to the verification badge.
 *
 * Usage:
 *   node scripts/backfill-store-verification.js --dry-run   # report only, no writes
 *   node scripts/backfill-store-verification.js             # apply
 *
 * Requires: serviceAccountKey.json in project root
 *
 * Stores used to be hidden until an admin flipped is_validated. That gate is
 * gone: every store is live on creation. is_validated is replaced by two
 * server-owned fields, and this script seeds them on existing documents:
 *
 *   is_verified  <- (is_validated === true)   the public badge
 *   is_suspended <- false                     abuse takedown, off by default
 *
 * It does NOT touch is_validated. That field still drives visibility on app
 * builds released before this change, and rewriting it here would either hide
 * stores from that cohort or undo a takedown.
 *
 * RUN THIS BEFORE DEPLOYING THE RETARGETED CLOUD FUNCTIONS. Once
 * onStoreVerified is live, setting is_verified: true fires it once per
 * document, which would mail the entire merchant base at once. Against the
 * currently deployed triggers this script is inert: onStoreValidated needs an
 * is_validated transition, and onStoreRejected needs is_rejected, which no code
 * has ever written.
 *
 * Safe to re-run: documents already holding the target values are skipped, so a
 * second run commits nothing and fires nothing.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 500;

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

/** Commit writes in chunks, or report them when running with --dry-run. */
async function commitInBatches(writes, label) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would write ${writes.length} ${label}`);
    return;
  }
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const { ref, data } of writes.slice(i, i + BATCH_SIZE)) {
      batch.update(ref, data);
    }
    await batch.commit();
    console.log(
      `  committed ${Math.min(i + BATCH_SIZE, writes.length)}/${writes.length} ${label}`,
    );
  }
}

async function backfillStores() {
  const snapshot = await db.collection("stores").get();
  const writes = [];
  const stats = {
    total: snapshot.size,
    unchanged: 0,
    willVerify: 0,
    settingVerifiedField: 0,
    settingSuspendedField: 0,
    noLegacyField: 0,
  };

  snapshot.forEach((docSnap) => {
    const store = docSnap.data();
    const targetVerified = store.is_validated === true;

    if (store.is_validated === undefined) {
      stats.noLegacyField += 1;
    }

    const update = {};
    if (store.is_verified !== targetVerified) {
      update.is_verified = targetVerified;
      stats.settingVerifiedField += 1;
      if (targetVerified) stats.willVerify += 1;
    }
    if (store.is_suspended !== false) {
      update.is_suspended = false;
      stats.settingSuspendedField += 1;
    }

    if (Object.keys(update).length === 0) {
      stats.unchanged += 1;
    } else {
      writes.push({ ref: docSnap.ref, data: update });
    }
  });

  console.log(
    `\nStores: ${stats.total} total, ${stats.unchanged} already correct`,
  );
  console.log(
    `  ${stats.settingVerifiedField} is_verified writes (${stats.willVerify} set to true)`,
  );
  console.log(
    `  ${stats.settingSuspendedField} is_suspended writes (all false)`,
  );
  console.log(
    `  ${stats.noLegacyField} store(s) had no is_validated field at all`,
  );

  await commitInBatches(writes, "store updates");
  return stats;
}

async function main() {
  console.log("=".repeat(60));
  console.log(
    DRY_RUN
      ? "STORE VERIFICATION BACKFILL (dry run - no writes)"
      : "STORE VERIFICATION BACKFILL (applying changes)",
  );
  console.log("=".repeat(60));

  const stats = await backfillStores();

  console.log(`\n${"=".repeat(60)}`);
  if (DRY_RUN) {
    console.log("Dry run complete - no data changed.");
    console.log(
      `Check that ${stats.willVerify} matches the console count of is_validated == true.`,
    );
  } else {
    console.log("Backfill complete.");
    console.log("Re-run with --dry-run to confirm it now reports 0 writes.");
  }
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nBackfill failed:", error);
    process.exit(1);
  });
