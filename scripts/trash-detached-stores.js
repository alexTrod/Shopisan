#!/usr/bin/env node
/**
 * Move stores whose owner account was deleted into the trash.
 *
 * Before adminDeleteUser trashed stores itself, it only detached them
 * (owner_id: null, previous_owner_id set), which left them live in the app.
 * This applies the current behavior to those leftovers: deleted_at /
 * deleted_by, so they disappear from the app, show in the admin Trash view,
 * and are purged with their posts and images after 30 days unless restored.
 *
 * Usage:
 *   node scripts/trash-detached-stores.js --dry-run
 *   node scripts/trash-detached-stores.js
 *
 * Requires: serviceAccountKey.json in project root
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const DRY_RUN = process.argv.includes("--dry-run");

const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`ERROR: Service account key not found at ${serviceAccountPath}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
  projectId: "shopisan-bad76",
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection("stores").get();
  const targets = snapshot.docs.filter((d) => {
    const store = d.data();
    return store.previous_owner_id && !store.owner_id && !store.deleted_at;
  });

  console.log(
    `${DRY_RUN ? "[dry-run] " : ""}${targets.length} live store(s) of deleted accounts:`,
  );
  targets.forEach((d) =>
    console.log(
      `  ${d.id} (id ${d.data().id}) "${d.data().name}" - previous owner ${d.data().previous_owner_id}`,
    ),
  );

  if (DRY_RUN || targets.length === 0) {
    console.log(DRY_RUN ? "Dry run - no data changed." : "Nothing to do.");
    return;
  }

  const batch = db.batch();
  targets.forEach((d) =>
    batch.update(d.ref, {
      deleted_at: admin.firestore.FieldValue.serverTimestamp(),
      deleted_by: "admin:user-deleted",
    }),
  );
  await batch.commit();
  console.log(`Done: ${targets.length} store(s) moved to the trash.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error.message || error);
    process.exit(1);
  });
