#!/usr/bin/env node
/**
 * Backfill ratings.user_id from the legacy user_profile_id field.
 *
 * Usage:
 *   node scripts/backfill-rating-user-ids.js --dry-run    # report only, no writes
 *   node scripts/backfill-rating-user-ids.js              # apply
 *
 * Requires: serviceAccountKey.json in project root
 *
 * firestore.rules gates rating update/delete on resource.data.user_id matching
 * request.auth.uid. Ratings written before the useStoreRatings fix only carry
 * user_profile_id, so without this backfill they can never be edited or
 * removed by their author. Run BEFORE deploying the new rules.
 *
 * Safe to re-run: only touches docs missing user_id.
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

async function backfillRatings() {
  const snapshot = await db.collection("ratings").get();
  const writes = [];
  const unresolved = [];
  let alreadySet = 0;

  snapshot.forEach((docSnap) => {
    const rating = docSnap.data();
    if (rating.user_id) {
      alreadySet += 1;
      return;
    }
    if (!rating.user_profile_id) {
      // No author recorded at all: nothing trustworthy to copy from.
      unresolved.push({ ratingId: docSnap.id, storeId: rating.store_id });
      return;
    }
    writes.push({
      ref: docSnap.ref,
      data: { user_id: rating.user_profile_id },
    });
  });

  console.log(
    `\nRatings: ${snapshot.size} total, ${alreadySet} already had user_id`,
  );
  console.log(
    `  ${writes.length} to backfill, ${unresolved.length} unresolved`,
  );
  await commitInBatches(writes, "rating updates");

  if (unresolved.length > 0) {
    console.log(
      `\n  WARNING: ${unresolved.length} rating(s) have no user_profile_id either.`,
    );
    console.log("  These stay unowned until fixed by hand:");
    unresolved
      .slice(0, 20)
      .forEach((r) =>
        console.log(`    rating ${r.ratingId} -> store_id ${r.storeId}`),
      );
    if (unresolved.length > 20) {
      console.log(`    ... and ${unresolved.length - 20} more`);
    }
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log(
    DRY_RUN
      ? "RATING USER_ID BACKFILL (dry run - no writes)"
      : "RATING USER_ID BACKFILL (applying changes)",
  );
  console.log("=".repeat(60));

  await backfillRatings();

  console.log(`\n${"=".repeat(60)}`);
  console.log(
    DRY_RUN ? "Dry run complete - no data changed." : "Backfill complete.",
  );
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nBackfill failed:", error);
    process.exit(1);
  });
