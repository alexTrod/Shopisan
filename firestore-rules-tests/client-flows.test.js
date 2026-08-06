/**
 * Client-flow regression tests: replay the exact Firestore call sequences the
 * app makes, per screen, against the deployed rules.
 *
 * rules.test.js proves the rules enforce the security model with hand-built
 * payloads. This file proves the model doesn't break the app: each test
 * mirrors a real call site (referenced by file:line) with the auth state it
 * actually runs under. The v1.1.0 login outage happened in the gap between
 * those two: rules correctly denied an unauthenticated users-collection scan,
 * and no test knew the login screen performed one.
 *
 * When a test here fails, fix the CLIENT (or add a migration) before touching
 * the rules.
 *
 * Run with: npm run test:rules
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
  getDocs,
  addDoc,
  collection,
  query,
  where,
} = require("firebase/firestore");

const USER = "user-uid";
const OWNER = "owner-uid";
const ADMIN = "admin-uid";

let testEnv;

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

    await setDoc(doc(db, "users", USER), {
      id: USER,
      email: "user@example.com",
      userType: "user",
      signupIntent: "user",
      is_admin: false,
    });
    await setDoc(doc(db, "users", OWNER), {
      id: OWNER,
      email: "owner@example.com",
      userType: "owner",
      signupIntent: "owner",
      is_admin: false,
    });
    await setDoc(doc(db, "users", ADMIN), {
      id: ADMIN,
      email: "admin@example.com",
      userType: "owner",
      is_admin: true,
    });

    await setDoc(doc(db, "stores", "store-1"), {
      id: 1,
      name: "Owned store",
      owner_id: OWNER,
      is_validated: true,
      is_verified: true,
      is_suspended: false,
    });
    // Catalog import (src/utils/migration.js) wrote stores with no owner_id
    // and none of the moderation keys.
    await setDoc(doc(db, "stores", "store-legacy"), {
      id: 2,
      name: "Imported store",
    });

    await setDoc(doc(db, "posts", "post-1"), {
      store: { id: 1 },
      description: "current post",
      owner_id: OWNER,
    });
    // Post written before commit e5e5907 introduced owner_id.
    await setDoc(doc(db, "posts", "post-legacy"), {
      store: { id: 1 },
      description: "pre-account-types post",
    });

    await setDoc(doc(db, "ratings", "rating-1"), {
      store_id: 1,
      user_id: USER,
      rating: 4,
    });

    await setDoc(doc(db, "countries", "BE"), { name: "Belgium" });
    await setDoc(doc(db, "cities", "brussels"), {
      name: "Brussels",
      country: "BE",
    });
    await setDoc(doc(db, "categories", "cat-1"), { name: "Fashion" });
    await setDoc(doc(db, "store_categories", "sc-1"), { name: "Clothing" });
  });
});

const asGuest = () => testEnv.unauthenticatedContext().firestore();
const asUser = (uid) => testEnv.authenticatedContext(uid).firestore();

describe("app launch, signed out (Home/map before login)", () => {
  test("store list scan succeeds (StoreService.js getAllStores)", async () => {
    await assertSucceeds(getDocs(collection(asGuest(), "stores")));
  });

  test("city filter loads countries (CountriesReducer.js fetchCountries)", async () => {
    // v1.1.0 regression: countries had no rules block, the default deny
    // rejected this read and blanked the CityFilter modal for everyone.
    await assertSucceeds(getDocs(collection(asGuest(), "countries")));
  });

  test("city filter loads cities (citiesService.js getCitiesLocale)", async () => {
    await assertSucceeds(getDocs(collection(asGuest(), "cities")));
  });

  test("category filters load (CategoriesReducer.js)", async () => {
    await assertSucceeds(getDocs(collection(asGuest(), "categories")));
    await assertSucceeds(getDocs(collection(asGuest(), "store_categories")));
  });

  test("store detail sheet loads ratings and posts (useStoreRatings, PostService)", async () => {
    await assertSucceeds(
      getDocs(
        query(collection(asGuest(), "ratings"), where("store_id", "==", 1)),
      ),
    );
    await assertSucceeds(
      getDocs(
        query(collection(asGuest(), "posts"), where("store.id", "==", 1)),
      ),
    );
  });
});

describe("login (UserActions.js fetchUserDataByLoginIdentifier)", () => {
  test("users collection scan is denied while signed out — email login must not perform it", async () => {
    // The v1.1.0 outage: this ran unconditionally before
    // signInWithEmailAndPassword and its rejection failed every login. It
    // must stay out of the email path (UserActions.js:555 keeps it inside
    // the username branch only).
    await assertFails(getDocs(collection(asGuest(), "users")));
  });

  test("post-signin own-profile read succeeds (fetchUserData getDoc)", async () => {
    await assertSucceeds(getDoc(doc(asUser(USER), "users", USER)));
  });

  test("post-signin email sync succeeds (fetchUserData updateDoc)", async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(USER), "users", USER), {
        email: "user@example.com",
        pendingEmail: null,
      }),
    );
  });
});

describe("signed-in shopper", () => {
  test("favorites write to own user doc (UserActions.js toggleFavoriteStore)", async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(USER), "users", USER), {
        favoriteStores: [1],
      }),
    );
  });

  test("submit a rating (useStoreRatings addDoc with user_id)", async () => {
    await assertSucceeds(
      addDoc(collection(asUser(USER), "ratings"), {
        store_id: 1,
        user_id: USER,
        rating: 5,
      }),
    );
  });

  test("re-rate own store rating (useStoreRatings updateDoc)", async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(USER), "ratings", "rating-1"), { rating: 2 }),
    );
  });
});

describe("signed-in owner", () => {
  test("create store (add_store handleSubmit payload)", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(OWNER), "stores", "store-new"), {
        id: 3,
        name: "New store",
        owner_id: OWNER,
        is_validated: true,
      }),
    );
  });

  test("edit own store (handle_store updateDoc, no moderation fields)", async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(OWNER), "stores", "store-1"), {
        name: "Renamed store",
      }),
    );
  });

  test("create post (PostService.createPost payload)", async () => {
    await assertSucceeds(
      addDoc(collection(asUser(OWNER), "posts"), {
        store: { id: 1 },
        description: "new post",
        price: 10,
        owner_id: OWNER,
      }),
    );
  });

  test("edit and delete own post (PostService update/delete)", async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(OWNER), "posts", "post-1"), {
        description: "edited",
      }),
    );
    await assertSucceeds(deleteDoc(doc(asUser(OWNER), "posts", "post-1")));
  });

  test("city upsert while saving a store (cityManagement ensureCityExists)", async () => {
    await assertSucceeds(
      addDoc(collection(asUser(OWNER), "cities"), {
        name: "Antwerp",
        country: "BE",
      }),
    );
  });
});

describe("legacy documents (written before v1.1.0 fields existed)", () => {
  test("admin can update and delete an owner_id-less post", async () => {
    // Regression: resource.data.owner_id on a missing key errors the whole
    // expression, and it used to sit ahead of isAdmin() in the ||.
    await assertSucceeds(
      updateDoc(doc(asUser(ADMIN), "posts", "post-legacy"), {
        description: "admin cleanup",
      }),
    );
    await assertSucceeds(deleteDoc(doc(asUser(ADMIN), "posts", "post-legacy")));
  });

  test("admin can update and delete an owner_id-less store", async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(ADMIN), "stores", "store-legacy"), {
        name: "admin cleanup",
      }),
    );
    await assertSucceeds(
      deleteDoc(doc(asUser(ADMIN), "stores", "store-legacy")),
    );
  });

  test("non-admins still cannot touch owner_id-less documents", async () => {
    await assertFails(
      updateDoc(doc(asUser(OWNER), "posts", "post-legacy"), {
        description: "not mine",
      }),
    );
    await assertFails(deleteDoc(doc(asUser(OWNER), "stores", "store-legacy")));
  });
});
