#!/usr/bin/env node
/**
 * Delete Firebase users and all related data
 *
 * Usage:
 *   node scripts/delete-users.js email1@example.com email2@example.com
 *
 * Requires: serviceAccountKey.json in project root
 *
 * Deletes:
 *   - Firebase Auth user
 *   - User document(s) in Firestore
 *   - All stores owned by user
 *   - All posts belonging to those stores
 *   - Password reset tokens
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

// Get emails from CLI args
const emails = process.argv.slice(2).filter((arg) => arg.includes("@"));

if (emails.length === 0) {
  console.error(`
Usage: node scripts/delete-users.js <email1> [email2] [email3] ...

Example:
  node scripts/delete-users.js user@example.com another@test.com
`);
  process.exit(1);
}

async function deleteUserByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${normalizedEmail}`);
  console.log("=".repeat(60));

  let authUid = null;
  const stats = {
    auth: false,
    userDocs: 0,
    stores: 0,
    posts: 0,
    passwordResets: 0,
  };

  // 1. Delete from Firebase Auth
  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
    authUid = userRecord.uid;
    console.log(`Found Auth user: ${authUid}`);
    await admin.auth().deleteUser(authUid);
    console.log(`✓ Deleted from Firebase Auth`);
    stats.auth = true;
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.log(`⚠ User not found in Firebase Auth`);
    } else {
      console.error(`✗ Auth error:`, error.message);
    }
  }

  // 2. Delete user documents from Firestore
  try {
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .get();

    for (const doc of usersSnapshot.docs) {
      if (!authUid) authUid = doc.id;
      await doc.ref.delete();
      stats.userDocs++;
      console.log(`✓ Deleted user document: ${doc.id}`);
    }

    // Also try by UID
    if (authUid) {
      const userDoc = await db.collection("users").doc(authUid).get();
      if (userDoc.exists) {
        await db.collection("users").doc(authUid).delete();
        stats.userDocs++;
        console.log(`✓ Deleted user document by UID: ${authUid}`);
      }
    }
  } catch (error) {
    console.error(`✗ Error deleting user docs:`, error.message);
  }

  // 3. Delete stores and their posts
  if (authUid) {
    try {
      const storesSnapshot = await db
        .collection("stores")
        .where("owner_id", "==", authUid)
        .get();

      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id;

        // Delete posts for this store
        const postsSnapshot = await db
          .collection("posts")
          .where("store.id", "==", storeId)
          .get();
        for (const postDoc of postsSnapshot.docs) {
          await postDoc.ref.delete();
          stats.posts++;
          console.log(`  ✓ Deleted post: ${postDoc.id}`);
        }

        // Delete the store
        await storeDoc.ref.delete();
        stats.stores++;
        console.log(
          `✓ Deleted store: ${storeId} (${storeDoc.data().name || "unnamed"})`,
        );
      }
    } catch (error) {
      console.error(`✗ Error deleting stores:`, error.message);
    }
  }

  // 4. Delete password reset tokens
  try {
    const resetDoc = await db
      .collection("passwordResets")
      .doc(normalizedEmail)
      .get();
    if (resetDoc.exists) {
      await db.collection("passwordResets").doc(normalizedEmail).delete();
      stats.passwordResets++;
      console.log(`✓ Deleted password reset token`);
    }
  } catch (error) {
    /* ignore */
  }

  console.log(
    `\nSummary: Auth=${stats.auth ? "Yes" : "No"}, UserDocs=${stats.userDocs}, Stores=${stats.stores}, Posts=${stats.posts}`,
  );
  return stats;
}

async function main() {
  console.log(`Deleting ${emails.length} user(s)...`);
  emails.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));

  for (const email of emails) {
    await deleteUserByEmail(email);
  }

  console.log("\n" + "=".repeat(60));
  console.log("COMPLETE - Users can now re-register");
  console.log("=".repeat(60));
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
