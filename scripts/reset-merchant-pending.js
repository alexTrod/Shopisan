#!/usr/bin/env node
/**
 * Put a merchant back into the pre-approval queue.
 *
 * For an account that got in without review (e.g. signed up from an app build
 * that predates the approval flow): sets users.merchantStatus to "pending" and
 * every non-trashed store it owns to status "pending". The merchant then shows
 * in the admin panel under Merchant requests and sees the waiting screen in
 * the app; approving it there sends the usual approval email.
 *
 * Also normalizes the legacy account type ("merchant" -> "owner") and drops the
 * dead is_owner field, like scripts/migrate-user-types.js.
 *
 * Usage:
 *   node scripts/reset-merchant-pending.js merchant@example.com --dry-run
 *   node scripts/reset-merchant-pending.js merchant@example.com
 *
 * Requires: serviceAccountKey.json in project root
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const DRY_RUN = process.argv.includes("--dry-run");
const email = process.argv
  .slice(2)
  .find((arg) => !arg.startsWith("--"))
  ?.trim()
  .toLowerCase();

if (!email) {
  console.error("Usage: node scripts/reset-merchant-pending.js <email> [--dry-run]");
  process.exit(1);
}

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
  const { uid } = await admin.auth().getUserByEmail(email);
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new Error(`No users/${uid} document for ${email}`);
  }
  const user = userSnap.data();
  if (user.userType !== "owner" && user.userType !== "merchant") {
    throw new Error(`${email} is not a store owner (userType ${user.userType})`);
  }

  // Legacy accounts reference stores by their in-doc id too.
  const ownerIds = [...new Set([uid, user.id].filter(Boolean))];
  const storeDocs = new Map();
  for (const ownerId of ownerIds) {
    const snap = await db.collection("stores").where("owner_id", "==", ownerId).get();
    snap.docs.forEach((d) => storeDocs.set(d.id, d));
  }
  const stores = [...storeDocs.values()].filter((d) => !d.data().deleted_at);

  const userUpdate = { merchantStatus: "pending" };
  if (user.userType === "merchant") userUpdate.userType = "owner";
  if (user.is_owner !== undefined) {
    userUpdate.is_owner = admin.firestore.FieldValue.delete();
  }

  console.log(`${DRY_RUN ? "[dry-run] " : ""}users/${uid} (${email})`);
  console.log(
    `  merchantStatus ${user.merchantStatus || "(missing)"} -> pending` +
      (userUpdate.userType ? ", userType merchant -> owner" : "") +
      (userUpdate.is_owner ? ", remove is_owner" : ""),
  );
  stores.forEach((d) =>
    console.log(
      `  store ${d.id} (id ${d.data().id}) "${d.data().name}": status ${d.data().status || "(missing)"} -> pending`,
    ),
  );

  if (DRY_RUN) {
    console.log("Dry run - no data changed.");
    return;
  }

  const batch = db.batch();
  batch.update(userRef, userUpdate);
  stores.forEach((d) => batch.update(d.ref, { status: "pending" }));
  await batch.commit();
  console.log(`Done: account and ${stores.length} store(s) are pending review.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error.message || error);
    process.exit(1);
  });
