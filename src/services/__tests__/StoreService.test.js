/**
 * StoreService Tests
 *
 * Covers the contracts that removing the approval gate depends on:
 * - stores are fetched unfiltered, and only suspended ones are dropped
 * - a missing is_suspended means "not suspended" (no backfill required)
 * - search suggestions rank verified first and carry the flag through
 * - filterStoresByRadius stays strictly distance-ordered
 * - pending stores are hidden from every shopper path; a missing status is
 *   visible (no backfill required)
 * - the expanding radius never falls back to the whole catalogue
 *
 * Run with: npx jest src/services/__tests__/StoreService.test.js
 */

const mockGetDocs = jest.fn();

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((_db, name) => ({ __collection: name })),
  getDocs: (...args) => mockGetDocs(...args),
}));

jest.mock("../../../firebaseconfig", () => ({
  firestore: {},
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../config/location", () => ({
  LOCATION_CONFIG: {
    SEARCH_RADIUS_KM: 20,
    STORE_CACHE_TTL: 1800000,
    RADIUS_STEPS: [5, 10, 20, 30, 50, 75, 100, 150, 200],
  },
  CACHE_KEYS: {
    STORES_CACHE: "@stores_cache_v2",
  },
}));

jest.mock("../LocationManager", () => ({
  __esModule: true,
  default: {
    // Flat-earth stand-in: distance is the latitude delta, which keeps the
    // ordering assertions readable.
    getDistanceInKm: (lat1, _lng1, lat2, _lng2) => Math.abs(lat2 - lat1),
  },
}));

import storeService from "../StoreService";

/** Build a store doc snapshot as Firestore would hand it back. */
const docOf = (id, data) => ({ id, data: () => data });

// filterStoresByRadius guards with a falsy check on latitude/longitude, so the
// origin cannot sit at 0,0.
const ORIGIN = { latitude: 50, longitude: 4 };

/** A store placed `distanceKm` north of ORIGIN. */
const storeAt = (name, distanceKm, extra = {}) => ({
  name,
  address: [
    {
      location: {
        geopoint: {
          latitude: ORIGIN.latitude + distanceKm,
          longitude: ORIGIN.longitude,
        },
      },
    },
  ],
  ...extra,
});

describe("StoreService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeService.allStores = [];
    storeService.isInitialized = false;
    storeService.pendingFetch = null;
    storeService.pendingFirebaseFetch = null;
  });

  describe("_doFetchFromFirebase - visibility", () => {
    it("fetches every store, with no approval filter", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          docOf("a", { name: "Never approved" }),
          docOf("b", { name: "Approved", is_validated: true }),
        ],
      });

      const stores = await storeService._doFetchFromFirebase();

      expect(stores.map((s) => s.name)).toEqual(["Never approved", "Approved"]);
    });

    it("drops suspended stores", async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          docOf("a", { name: "Live" }),
          docOf("b", { name: "Taken down", is_suspended: true }),
        ],
      });

      const stores = await storeService._doFetchFromFirebase();

      expect(stores.map((s) => s.name)).toEqual(["Live"]);
    });

    it("keeps stores that have no is_suspended field at all", async () => {
      // The reason suspension is filtered client-side: a Firestore where()
      // would drop every document written before the field existed, making a
      // full backfill a hard prerequisite. undefined must read as not-suspended.
      mockGetDocs.mockResolvedValue({
        docs: [
          docOf("legacy", { name: "Legacy" }),
          docOf("explicit", { name: "Explicit", is_suspended: false }),
        ],
      });

      const stores = await storeService._doFetchFromFirebase();

      expect(stores.map((s) => s.name)).toEqual(["Legacy", "Explicit"]);
    });
  });

  describe("searchStoresByName", () => {
    it("ranks verified stores above unverified ones", async () => {
      storeService.allStores = [
        { id: 1, name: "Alpha Bakery" },
        { id: 2, name: "Zeta Bakery", is_verified: true },
      ];

      const results = storeService.searchStoresByName("bakery");

      // Verified wins even though the alphabetical tiebreak favours Alpha.
      expect(results.map((s) => s.name)).toEqual([
        "Zeta Bakery",
        "Alpha Bakery",
      ]);
    });

    it("still prefers a prefix match between two unverified stores", () => {
      storeService.allStores = [
        { id: 1, name: "The Bakery" },
        { id: 2, name: "Bakery Corner" },
      ];

      const results = storeService.searchStoresByName("bakery");

      expect(results.map((s) => s.name)).toEqual([
        "Bakery Corner",
        "The Bakery",
      ]);
    });

    it("carries is_verified through the projection", () => {
      // Without this the sort above would be invisible to the suggestion row.
      storeService.allStores = [{ id: 1, name: "Bakery", is_verified: true }];

      const [result] = storeService.searchStoresByName("bakery");

      expect(result.is_verified).toBe(true);
    });

    it("projects a missing is_verified as false, not undefined", () => {
      storeService.allStores = [{ id: 1, name: "Bakery" }];

      const [result] = storeService.searchStoresByName("bakery");

      expect(result.is_verified).toBe(false);
    });
  });

  describe("filterStoresByRadius", () => {
    it("orders strictly by distance, ignoring verification", () => {
      // Regression guard: home reads [0] as "the nearest shop" and recentres
      // the map on it. A verified store 5 km out must never take that slot.
      storeService.allStores = [
        storeAt("far-verified", 5, { is_verified: true }),
        storeAt("near-plain", 1),
        storeAt("mid-verified", 3, { is_verified: true }),
      ];

      const results = storeService.filterStoresByRadius(ORIGIN, 20);

      expect(results.map((s) => s.name)).toEqual([
        "near-plain",
        "mid-verified",
        "far-verified",
      ]);
    });

    it("attaches the distance the display sort buckets on", () => {
      storeService.allStores = [storeAt("near-plain", 1)];

      const [result] = storeService.filterStoresByRadius(ORIGIN, 20);

      expect(result.distance).toBeCloseTo(1);
    });

    it("hides stores still pending admin approval", () => {
      // This is the single shopper choke point: Home, Map, deep links and the
      // expanding-radius steps all read through here.
      storeService.allStores = [
        storeAt("pending", 1, { status: "pending" }),
        storeAt("approved", 2, { status: "approved" }),
      ];

      const results = storeService.filterStoresByRadius(ORIGIN, 20);

      expect(results.map((s) => s.name)).toEqual(["approved"]);
    });

    it("keeps stores with no status field at all (missing means approved)", () => {
      storeService.allStores = [storeAt("legacy", 1)];

      const results = storeService.filterStoresByRadius(ORIGIN, 20);

      expect(results.map((s) => s.name)).toEqual(["legacy"]);
    });
  });

  describe("searchStoresByName - pending stores", () => {
    it("never suggests a pending store", () => {
      storeService.allStores = [
        { id: 1, name: "Bakery Pending", status: "pending" },
        { id: 2, name: "Bakery Live", status: "approved" },
        { id: 3, name: "Bakery Legacy" },
      ];

      const results = storeService.searchStoresByName("bakery");

      expect(results.map((s) => s.name)).toEqual([
        "Bakery Legacy",
        "Bakery Live",
      ]);
    });
  });

  describe("findStoresWithExpandingRadius", () => {
    it("returns the first radius step that satisfies minStores", () => {
      storeService.allStores = [storeAt("near", 8)];

      const { stores, radius } = storeService.findStoresWithExpandingRadius(
        ORIGIN,
        1,
      );

      expect(stores.map((s) => s.name)).toEqual(["near"]);
      expect(radius).toBe(10);
    });

    it("returns no stores at all when nothing is inside the largest step", () => {
      // Regression guard for the fresh-install bug: a slow GPS left the app
      // on the Brussels default and this fallback handed the whole catalogue
      // back as "nearby".
      storeService.allStores = [storeAt("far-away", 1000)];

      const { stores, radius } = storeService.findStoresWithExpandingRadius(
        ORIGIN,
        1,
      );

      expect(stores).toEqual([]);
      expect(radius).toBe("none");
    });

    it("does not let a pending store satisfy the minimum", () => {
      storeService.allStores = [storeAt("pending", 1, { status: "pending" })];

      const { stores } = storeService.findStoresWithExpandingRadius(ORIGIN, 1);

      expect(stores).toEqual([]);
    });

    it("keeps calculateAutoZoom usable on the empty fallback", () => {
      expect(storeService.calculateAutoZoom([])).toBe(12);
    });
  });
});
