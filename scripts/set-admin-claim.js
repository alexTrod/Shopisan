#!/usr/bin/env node
/**
 * Grant (or revoke) the `admin: true` custom claim on a Firebase Auth user.
 *
 * The claim is the admin identity used by firestore.rules isAdmin() and by
 * the admin-only callables (deleteUser, adminDeleteUser, adminDeleteStore).
 * Also sets is_admin: true on the users/{uid} document so the legacy
 * doc-field path stays in sync.
 *
 * Usage:
 *   node scripts/set-admin-claim.js admin@example.com
 *   node scripts/set-admin-claim.js admin@example.com --revoke
 *
 * Requires: serviceAccountKey.json in project root
 *
 * Note: custom claims are baked into the ID token, so the user must sign out
 * and back in (or force-refresh the token) before the claim takes effect.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Load service account
const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`
ERROR: Service account key not found at ${serviceAccountPath}

To fix:
1. Go to: https://console.firebase.google.com/project/shopisan-bad76/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Save the file as serviceAccountKey.json in the project root
`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const main = async () => {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((arg) => !arg.startsWith("--"));

  if (!email) {
    console.error(
      "Usage: node scripts/set-admin-claim.js <email> [--revoke]",
    );
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
  const isAdmin = !revoke;

  await admin.auth().setCustomUserClaims(userRecord.uid, {
    ...(userRecord.customClaims || {}),
    admin: isAdmin,
  });
  console.log(
    `Set admin: ${isAdmin} custom claim on ${normalizedEmail} (${userRecord.uid})`,
  );

  // Keep the legacy is_admin doc field in sync if the user doc exists
  const userDocRef = admin
    .firestore()
    .collection("users")
    .doc(userRecord.uid);
  const userDoc = await userDocRef.get();
  if (userDoc.exists) {
    await userDocRef.update({ is_admin: isAdmin });
    console.log(`Updated users/${userRecord.uid} is_admin: ${isAdmin}`);
  } else {
    console.log(
      `No users/${userRecord.uid} document found - claim set only (that is sufficient for rules and callables)`,
    );
  }

  console.log(
    "Done. The user must sign out/in (or refresh the ID token) for the claim to apply.",
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exit(1);
  });
