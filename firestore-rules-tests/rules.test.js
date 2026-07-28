/**
 * Firestore security rules tests.
 *
 * These are the enforcement layer for the shopper/owner split — a mistake here
 * is a security hole, not a UI glitch. Everything else in the app is a
 * convenience wrapper over what these rules allow.
 *
 * Run with: npm run test:rules  (boots the Firestore emulator automatically)
 */

const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  addDoc,
  collection,
} = require("firebase/firestore");

const SHOPPER = "shopper-uid";
const OWNER_A = "owner-a-uid";
const OWNER_B = "owner-b-uid";
const LEGACY_MERCHANT = "legacy-merchant-uid";
const ADMIN = "admin-uid";
const PRE_MIGRATION = "pre-migration-uid";

let testEnv;

const seedUser = (db, uid, data) =>
  setDoc(doc(db, "users", uid), {
    id: uid,
    email: `${uid}@example.com`,
    username: uid,
    is_admin: false,
    ...data,
  });

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-shopisan",
    firestore: {
      rules: fs.readFileSync(
        path.join(__dirname, "..", "firestore.rules"),
        "utf8",
      ),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await seedUser(db, SHOPPER, { userType: "user", signupIntent: "user" });
    await seedUser(db, OWNER_A, { userType: "owner", signupIntent: "owner" });
    await seedUser(db, OWNER_B, { userType: "owner", signupIntent: "owner" });
    // Old app builds still write the pre-migration value.
    await seedUser(db, LEGACY_MERCHANT, { userType: "merchant" });
    await seedUser(db, ADMIN, { userType: "owner", is_admin: true });
    // Written before the migration: no userType, no signupIntent.
    await setDoc(doc(db, "users", PRE_MIGRATION), {
      id: PRE_MIGRATION,
      email: "old@example.com",
      username: "old",
    });

    await setDoc(doc(db, "stores", "store-a"), {
      id: 1,
      name: "Store A",
      owner_id: OWNER_A,
    });
    await setDoc(doc(db, "stores", "store-b"), {
      id: 2,
      name: "Store B",
      owner_id: OWNER_B,
    });

    await setDoc(doc(db, "posts", "post-a"), {
      store: { id: 1 },
      owner_id: OWNER_A,
      images: ["https://cdn.example/a.jpg"],
    });
  });
});

const asUser = (uid) => testEnv.authenticatedContext(uid).firestore();
const asGuest = () => testEnv.unauthenticatedContext().firestore();

describe("users - privileged fields are frozen", () => {
  it("blocks a shopper from promoting themselves to owner", async () => {
    // The whole account-type split rests on this one case.
    const db = asUser(SHOPPER);
    await assertFails(
      updateDoc(doc(db, "users", SHOPPER), { userType: "owner" }),
    );
  });

  it("blocks a user from making themselves an admin", async () => {
    const db = asUser(SHOPPER);
    await assertFails(updateDoc(doc(db, "users", SHOPPER), { is_admin: true }));
  });

  it("blocks rewriting signupIntent", async () => {
    const db = asUser(SHOPPER);
    await assertFails(
      updateDoc(doc(db, "users", SHOPPER), { signupIntent: "owner" }),
    );
  });

  it("allows a user to edit their own non-privileged profile fields", async () => {
    const db = asUser(SHOPPER);
    await assertSucceeds(
      updateDoc(doc(db, "users", SHOPPER), { username: "renamed" }),
    );
  });

  it("allows a pre-migration user (no signupIntent) to update their profile", async () => {
    // Regression: reading a missing key errors in rules, which would deny
    // every profile write these users make until the migration runs.
    const db = asUser(PRE_MIGRATION);
    await assertSucceeds(
      updateDoc(doc(db, "users", PRE_MIGRATION), {
        email: "new@example.com",
      }),
    );
  });

  it("blocks reading another user's document", async () => {
    const db = asUser(SHOPPER);
    await assertFails(getDoc(doc(db, "users", OWNER_A)));
  });

  it("allows an admin to read any user document", async () => {
    const db = asUser(ADMIN);
    await assertSucceeds(getDoc(doc(db, "users", SHOPPER)));
  });
});

describe("stores - only owner accounts can create", () => {
  it("blocks a shopper from creating a store", async () => {
    const db = asUser(SHOPPER);
    await assertFails(
      setDoc(doc(db, "stores", "new-store"), {
        id: 3,
        name: "Nope",
        owner_id: SHOPPER,
      }),
    );
  });

  it("allows an owner to create a store they own", async () => {
    const db = asUser(OWNER_A);
    await assertSucceeds(
      setDoc(doc(db, "stores", "new-store"), {
        id: 3,
        name: "Mine",
        owner_id: OWNER_A,
      }),
    );
  });

  it("blocks an owner from creating a store attributed to someone else", async () => {
    const db = asUser(OWNER_A);
    await assertFails(
      setDoc(doc(db, "stores", "new-store"), {
        id: 3,
        name: "Theirs",
        owner_id: OWNER_B,
      }),
    );
  });

  it("still accepts the legacy merchant value during rollout", async () => {
    // Old builds keep working until scripts/migrate-user-types.js rolls out.
    const db = asUser(LEGACY_MERCHANT);
    await assertSucceeds(
      setDoc(doc(db, "stores", "legacy-store"), {
        id: 4,
        name: "Legacy",
        owner_id: LEGACY_MERCHANT,
      }),
    );
  });

  it("blocks an owner from editing another owner's store", async () => {
    const db = asUser(OWNER_A);
    await assertFails(
      updateDoc(doc(db, "stores", "store-b"), { name: "Hijacked" }),
    );
  });

  it("allows an owner to edit their own store", async () => {
    const db = asUser(OWNER_A);
    await assertSucceeds(
      updateDoc(doc(db, "stores", "store-a"), { name: "Renamed" }),
    );
  });

  it("allows an admin to edit any store", async () => {
    // The old rules checked a `role` field the app never writes, so this
    // branch was dead.
    const db = asUser(ADMIN);
    await assertSucceeds(
      updateDoc(doc(db, "stores", "store-a"), { name: "Moderated" }),
    );
  });

  it("lets anyone read stores, signed in or not", async () => {
    await assertSucceeds(getDoc(doc(asGuest(), "stores", "store-a")));
  });
});

describe("posts - only the owning store owner can write", () => {
  it("blocks a shopper from creating a post", async () => {
    const db = asUser(SHOPPER);
    await assertFails(
      addDoc(collection(db, "posts"), {
        store: { id: 1 },
        owner_id: SHOPPER,
        images: ["https://cdn.example/x.jpg"],
      }),
    );
  });

  it("allows an owner to create a post for their own store", async () => {
    const db = asUser(OWNER_A);
    await assertSucceeds(
      addDoc(collection(db, "posts"), {
        store: { id: 1 },
        owner_id: OWNER_A,
        images: ["https://cdn.example/x.jpg"],
      }),
    );
  });

  it("blocks creating a post attributed to another owner", async () => {
    const db = asUser(OWNER_B);
    await assertFails(
      addDoc(collection(db, "posts"), {
        store: { id: 1 },
        owner_id: OWNER_A,
        images: ["https://cdn.example/x.jpg"],
      }),
    );
  });

  it("blocks owner B from updating owner A's post", async () => {
    // Previously allowed: any authenticated user could rewrite any post.
    const db = asUser(OWNER_B);
    await assertFails(
      updateDoc(doc(db, "posts", "post-a"), { images: ["https://evil"] }),
    );
  });

  it("blocks owner B from deleting owner A's post", async () => {
    const db = asUser(OWNER_B);
    await assertFails(deleteDoc(doc(db, "posts", "post-a")));
  });

  it("blocks a shopper from deleting any post", async () => {
    const db = asUser(SHOPPER);
    await assertFails(deleteDoc(doc(db, "posts", "post-a")));
  });

  it("allows an owner to update and delete their own post", async () => {
    const db = asUser(OWNER_A);
    await assertSucceeds(
      updateDoc(doc(db, "posts", "post-a"), { images: ["https://cdn/new"] }),
    );
    await assertSucceeds(deleteDoc(doc(db, "posts", "post-a")));
  });

  it("allows an admin to delete any post", async () => {
    const db = asUser(ADMIN);
    await assertSucceeds(deleteDoc(doc(db, "posts", "post-a")));
  });

  it("lets anyone read posts", async () => {
    await assertSucceeds(getDoc(doc(asGuest(), "posts", "post-a")));
  });
});

describe("ratings - shoppers must keep rating", () => {
  it("allows a shopper to submit a rating", async () => {
    // The entire point of keeping shoppers as a type: they still rate.
    const db = asUser(SHOPPER);
    await assertSucceeds(
      addDoc(collection(db, "ratings"), {
        store_id: 1,
        user_id: SHOPPER,
        score: 5,
      }),
    );
  });

  it("blocks submitting a rating attributed to someone else", async () => {
    const db = asUser(SHOPPER);
    await assertFails(
      addDoc(collection(db, "ratings"), {
        store_id: 1,
        user_id: OWNER_A,
        score: 1,
      }),
    );
  });

  it("blocks editing another user's rating", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "ratings", "rating-a"), {
        store_id: 1,
        user_id: OWNER_A,
        score: 5,
      });
    });

    const db = asUser(SHOPPER);
    await assertFails(updateDoc(doc(db, "ratings", "rating-a"), { score: 1 }));
  });

  it("allows a user to update their own rating", async () => {
    // The client re-rates by updating the existing document; this previously
    // always denied because the rules checked `userId` and the app writes
    // `user_id`.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "ratings", "rating-s"), {
        store_id: 1,
        user_id: SHOPPER,
        score: 3,
      });
    });

    const db = asUser(SHOPPER);
    await assertSucceeds(
      updateDoc(doc(db, "ratings", "rating-s"), { score: 5 }),
    );
  });

  it("blocks unauthenticated rating", async () => {
    await assertFails(
      addDoc(collection(asGuest(), "ratings"), {
        store_id: 1,
        user_id: SHOPPER,
        score: 5,
      }),
    );
  });
});

describe("guests", () => {
  it("cannot create stores or posts", async () => {
    const db = asGuest();
    await assertFails(
      setDoc(doc(db, "stores", "guest-store"), { id: 9, owner_id: "x" }),
    );
    await assertFails(
      addDoc(collection(db, "posts"), { store: { id: 1 }, owner_id: "x" }),
    );
  });

  it("cannot read user documents", async () => {
    await assertFails(getDoc(doc(asGuest(), "users", SHOPPER)));
  });
});
