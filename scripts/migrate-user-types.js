#!/usr/bin/env node
/**
 * Migrate account types from shopper/merchant to user/owner.
 *
 * Usage:
 *   node scripts/migrate-user-types.js --dry-run    # report only, no writes
 *   node scripts/migrate-user-types.js              # apply
 *   ... --inspect=someone@example.com               # also print that account
 *                                                   # and its stores (repeatable)
 *
 * Requires: serviceAccountKey.json in project root
 *
 * Users:
 *   - userType "merchant" -> "owner", "shopper" -> "user", missing -> "user"
 *   - anyone owning at least one store is forced to "owner" regardless of their
 *     stored type, so the migration cannot lock an owner out of their own store
 *   - backfills signupIntent (analytics only) where absent
 *   - removes the dead is_owner field (written at signup, never read)
 *
 * Posts:
 *   - backfills owner_id by joining store.id -> stores.owner_id. firestore.rules
 *     matches post.owner_id against request.auth.uid; posts without it become
 *     uneditable by their owner.
 *
 * Also reports stores with a null owner_id, which are uneditable by anyone and
 * need manual repair.
 *
 * Pre-approval report (read only, never written): owners with no
 * merchantStatus (the app treats them as approved), admins that are also
 * owners, accounts carrying only the legacy is_owner flag (shown as shoppers
 * in the app; NOT promoted, because old signups wrote is_owner: true for any
 * userType other than "shopper", including a missing one), and live stores
 * whose owner account was deleted (previous_owner_id set, not in the trash).
 *
 * Safe to re-run: every step is idempotent.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const DRY_RUN = process.argv.includes("--dry-run");
const INSPECT_EMAILS = process.argv
  .filter((arg) => arg.startsWith("--inspect="))
  .map((arg) => arg.slice("--inspect=".length).trim().toLowerCase())
  .filter(Boolean);
const BATCH_SIZE = 500;

const USER_TYPES = { SHOPPER: "user", OWNER: "owner" };
const LEGACY = { shopper: USER_TYPES.SHOPPER, merchant: USER_TYPES.OWNER };

const normalizeUserType = (userType) => {
  if (userType === USER_TYPES.SHOPPER || userType === USER_TYPES.OWNER) {
    return userType;
  }
  return LEGACY[userType] || USER_TYPES.SHOPPER;
};

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

/** uid -> owner_id map, plus the stores that have no owner at all. */
async function loadStoreOwnership() {
  const snapshot = await db.collection("stores").get();
  const ownerIds = new Set();
  const orphanStores = [];
  // store.id is a sequential int, distinct from the Firestore document id.
  // Posts reference this numeric id, so posts must be joined on it.
  const ownerByStoreId = new Map();

  snapshot.forEach((docSnap) => {
    const store = docSnap.data();
    if (store.owner_id) {
      ownerIds.add(store.owner_id);
      ownerByStoreId.set(String(store.id), store.owner_id);
    } else {
      orphanStores.push({ docId: docSnap.id, id: store.id, name: store.name });
    }
  });

  return { ownerIds, orphanStores, ownerByStoreId, total: snapshot.size };
}

async function migrateUsers(ownerIds) {
  const snapshot = await db.collection("users").get();
  const writes = [];
  const stats = { total: snapshot.size, unchanged: 0, promoted: 0, remapped: 0 };

  snapshot.forEach((docSnap) => {
    const user = docSnap.data();
    const current = user.userType;
    let next = normalizeUserType(current);

    // Owning a store always wins: demoting an owner to shopper would leave
    // their store editable by nobody.
    if (ownerIds.has(docSnap.id) || ownerIds.has(user.id)) {
      if (next !== USER_TYPES.OWNER) {
        stats.promoted += 1;
      }
      next = USER_TYPES.OWNER;
    }

    const update = {};
    if (current !== next) {
      update.userType = next;
      if (current !== undefined) stats.remapped += 1;
    }
    if (user.signupIntent === undefined) {
      // Preserve the original selection for funnel analytics.
      update.signupIntent = normalizeUserType(current);
    }
    if (user.is_owner !== undefined) {
      update.is_owner = admin.firestore.FieldValue.delete();
    }

    if (Object.keys(update).length === 0) {
      stats.unchanged += 1;
    } else {
      writes.push({ ref: docSnap.ref, data: update });
    }
  });

  console.log(`\nUsers: ${stats.total} total, ${stats.unchanged} unchanged`);
  console.log(`  ${stats.remapped} type remapped, ${stats.promoted} promoted to owner (owns a store)`);
  await commitInBatches(writes, "user updates");
  return stats;
}

async function migratePosts(ownerByStoreId) {
  const snapshot = await db.collection("posts").get();
  const writes = [];
  const unresolved = [];
  let alreadySet = 0;

  snapshot.forEach((docSnap) => {
    const post = docSnap.data();
    if (post.owner_id) {
      alreadySet += 1;
      return;
    }

    const ownerId = ownerByStoreId.get(String(post.store?.id));
    if (!ownerId) {
      // Never guess an owner: a wrong owner_id hands write access to the
      // wrong account.
      unresolved.push({ postId: docSnap.id, storeId: post.store?.id });
      return;
    }
    writes.push({ ref: docSnap.ref, data: { owner_id: ownerId } });
  });

  console.log(`\nPosts: ${snapshot.size} total, ${alreadySet} already had owner_id`);
  console.log(`  ${writes.length} to backfill, ${unresolved.length} unresolved`);
  await commitInBatches(writes, "post updates");

  if (unresolved.length > 0) {
    console.log(
      `\n  WARNING: ${unresolved.length} post(s) have no resolvable store owner.`,
    );
    console.log("  These stay uneditable until fixed by hand:");
    unresolved
      .slice(0, 20)
      .forEach((p) => console.log(`    post ${p.postId} -> store.id ${p.storeId}`));
    if (unresolved.length > 20) {
      console.log(`    ... and ${unresolved.length - 20} more`);
    }
  }

  return { unresolved };
}

const printList = (items, format, max = 30) => {
  items.slice(0, max).forEach((item) => console.log(`    ${format(item)}`));
  if (items.length > max) {
    console.log(`    ... and ${items.length - max} more`);
  }
};

const tsToIso = (value) =>
  value && typeof value.toDate === "function" ? value.toDate().toISOString() : value;

/** Read-only report for the merchant pre-approval flow. */
async function reportPreapproval() {
  const [usersSnap, storesSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("stores").get(),
  ]);
  const stores = storesSnap.docs.map((d) => ({ docId: d.id, ...d.data() }));
  const storesByOwner = new Map();
  stores.forEach((store) => {
    if (!store.owner_id) return;
    if (!storesByOwner.has(store.owner_id)) storesByOwner.set(store.owner_id, []);
    storesByOwner.get(store.owner_id).push(store);
  });
  const storesOf = (docId, user) => [
    ...(storesByOwner.get(docId) || []),
    ...(user.id && user.id !== docId ? storesByOwner.get(user.id) || [] : []),
  ];

  const ownersWithoutStatus = [];
  const adminOwners = [];
  const legacyFlagOnly = [];
  const statusCounts = {};

  usersSnap.forEach((docSnap) => {
    const user = docSnap.data();
    const isOwner = user.userType === "owner" || user.userType === "merchant";
    const label = `${user.email || "(no email)"} [${docSnap.id}]`;
    if (isOwner) {
      const key = user.merchantStatus || "(missing = approved)";
      statusCounts[key] = (statusCounts[key] || 0) + 1;
      const owned = storesOf(docSnap.id, user);
      if (!user.merchantStatus) {
        ownersWithoutStatus.push({ label, stores: owned.length });
      }
      if (user.is_admin === true) {
        adminOwners.push({ label, status: user.merchantStatus, stores: owned.length });
      }
    } else if (user.is_owner === true) {
      legacyFlagOnly.push({
        label,
        userType: user.userType,
        stores: storesOf(docSnap.id, user).length,
      });
    }
  });

  console.log("\nPre-approval report (read only)");
  console.log("  Owners by merchantStatus:", statusCounts);
  console.log(
    `  ${ownersWithoutStatus.length} owner(s) without merchantStatus (treated as approved):`,
  );
  printList(ownersWithoutStatus, (u) => `${u.label} - ${u.stores} store(s)`);
  console.log(`  ${adminOwners.length} admin account(s) that are also owners:`);
  printList(adminOwners, (u) => `${u.label} - status ${u.status || "(missing)"}, ${u.stores} store(s)`);
  console.log(
    `  ${legacyFlagOnly.length} account(s) with only the legacy is_owner flag (shoppers in the app):`,
  );
  printList(legacyFlagOnly, (u) => `${u.label} - userType ${u.userType}, ${u.stores} store(s)`);

  const detachedLive = stores.filter((st) => st.previous_owner_id && !st.deleted_at);
  console.log(
    `  ${detachedLive.length} live store(s) whose owner account was deleted (should be in the trash):`,
  );
  printList(detachedLive, (st) => `doc ${st.docId} (id ${st.id}) "${st.name}" - previous owner ${st.previous_owner_id}`);

  const pendingStores = stores.filter((st) => st.status === "pending" && !st.deleted_at);
  console.log(`  ${pendingStores.length} pending store(s) waiting for review`);

  for (const email of INSPECT_EMAILS) {
    console.log(`\nInspect ${email}`);
    try {
      const record = await admin.auth().getUserByEmail(email);
      console.log(`  auth uid ${record.uid}, created ${record.metadata.creationTime}, claims`, record.customClaims || {});
    } catch (error) {
      console.log(`  no Auth user (${error.code || error.message})`);
    }
    const matches = usersSnap.docs.filter(
      (d) => String(d.data().email || "").toLowerCase() === email,
    );
    if (matches.length === 0) console.log("  no users doc");
    matches.forEach((d) => {
      const u = d.data();
      console.log(`  users/${d.id}`, {
        id: u.id,
        userType: u.userType,
        is_owner: u.is_owner,
        merchantStatus: u.merchantStatus,
        signupIntent: u.signupIntent,
        is_admin: u.is_admin,
        created: tsToIso(u.created),
      });
      storesOf(d.id, u).forEach((st) =>
        console.log(`    store ${st.docId}`, {
          id: st.id,
          name: st.name,
          status: st.status,
          deleted_at: tsToIso(st.deleted_at),
          created: tsToIso(st.created),
        }),
      );
    });
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log(
    DRY_RUN
      ? "USER TYPE MIGRATION (dry run - no writes)"
      : "USER TYPE MIGRATION (applying changes)",
  );
  console.log("=".repeat(60));

  const { ownerIds, orphanStores, ownerByStoreId, total } =
    await loadStoreOwnership();
  console.log(`\nStores: ${total} total, ${ownerIds.size} distinct owners`);

  await migrateUsers(ownerIds);
  await migratePosts(ownerByStoreId);
  await reportPreapproval();

  if (orphanStores.length > 0) {
    console.log(
      `\n  WARNING: ${orphanStores.length} store(s) have a null owner_id.`,
    );
    console.log("  Nobody can edit these; assign an owner manually:");
    orphanStores
      .slice(0, 20)
      .forEach((s) => console.log(`    doc ${s.docId} (id ${s.id}) "${s.name}"`));
    if (orphanStores.length > 20) {
      console.log(`    ... and ${orphanStores.length - 20} more`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(
    DRY_RUN ? "Dry run complete - no data changed." : "Migration complete.",
  );
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nMigration failed:", error);
    process.exit(1);
  });
