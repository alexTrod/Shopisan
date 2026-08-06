/**
 * Ordering rules for store lists.
 *
 * These two helpers are the only place verification is allowed to reorder
 * anything. StoreService.filterStoresByRadius stays strictly distance-sorted
 * because callers read its first element as "the nearest shop".
 */

import {
  sortVerifiedFirst,
  sortByProximityThenVerified,
} from "../storeSorting";

const store = (name, distance, is_verified) => ({
  name,
  distance,
  is_verified,
});

describe("sortVerifiedFirst", () => {
  it("puts verified stores ahead of unverified ones", () => {
    const result = sortVerifiedFirst([
      store("plain", 0, false),
      store("verified", 0, true),
    ]);

    expect(result.map((s) => s.name)).toEqual(["verified", "plain"]);
  });

  it("treats a missing is_verified as unverified", () => {
    // Every store written before the badge existed lacks the field.
    const result = sortVerifiedFirst([
      { name: "legacy" },
      store("verified", 0, true),
    ]);

    expect(result.map((s) => s.name)).toEqual(["verified", "legacy"]);
  });

  it("preserves the incoming order within each group", () => {
    const result = sortVerifiedFirst([
      store("a", 0, false),
      store("b", 0, true),
      store("c", 0, false),
      store("d", 0, true),
    ]);

    expect(result.map((s) => s.name)).toEqual(["b", "d", "a", "c"]);
  });

  it("does not mutate the input", () => {
    const input = [store("plain", 0, false), store("verified", 0, true)];
    const before = input.map((s) => s.name);

    sortVerifiedFirst(input);

    expect(input.map((s) => s.name)).toEqual(before);
  });

  it("returns an empty array for a non-array input", () => {
    expect(sortVerifiedFirst(undefined)).toEqual([]);
    expect(sortVerifiedFirst(null)).toEqual([]);
  });
});

describe("sortByProximityThenVerified", () => {
  it("lets verification win inside the same distance bucket", () => {
    // 1.8 km and 1.9 km both land in bucket 1 at the 2 km default.
    const result = sortByProximityThenVerified([
      store("plain-1.9", 1.9, false),
      store("verified-1.8", 1.8, true),
    ]);

    expect(result.map((s) => s.name)).toEqual(["verified-1.8", "plain-1.9"]);
  });

  it("keeps a much closer unverified store on top", () => {
    // This is the whole point of bucketing: a verified shop 4 km away must not
    // outrank one 300 m away in a proximity marketplace.
    const result = sortByProximityThenVerified([
      store("verified-4.0", 4.0, true),
      store("plain-0.3", 0.3, false),
    ]);

    expect(result.map((s) => s.name)).toEqual(["plain-0.3", "verified-4.0"]);
  });

  it("orders the full mixed list by bucket, then badge, then distance", () => {
    // At the 2 km default, everything under 2 km shares bucket 1, so the badge
    // decides among 0.3, 1.8 and 1.9 and only 4.0 is held back by distance.
    const result = sortByProximityThenVerified([
      store("plain-1.9", 1.9, false),
      store("verified-4.0", 4.0, true),
      store("plain-0.3", 0.3, false),
      store("verified-1.8", 1.8, true),
    ]);

    expect(result.map((s) => s.name)).toEqual([
      "verified-1.8",
      "plain-0.3",
      "plain-1.9",
      "verified-4.0",
    ]);
  });

  it("never lets the badge jump a bucket boundary", () => {
    // The guard that makes bucketing worth having: 4.0 km is bucket 2, so no
    // amount of verification lifts it above a store in bucket 1.
    const result = sortByProximityThenVerified([
      store("verified-4.0", 4.0, true),
      store("plain-1.9", 1.9, false),
    ]);

    expect(result.map((s) => s.name)).toEqual(["plain-1.9", "verified-4.0"]);
  });

  it("falls back to exact distance between two equally-badged neighbours", () => {
    const result = sortByProximityThenVerified([
      store("far", 1.9, true),
      store("near", 1.1, true),
    ]);

    expect(result.map((s) => s.name)).toEqual(["near", "far"]);
  });

  it("honours a custom bucket width", () => {
    // 1.2 and 1.9 share bucket 1 at the 2 km default, so the badge would win.
    // At 0.5 km they fall in different bands and distance takes over.
    const stores = [
      store("verified-1.9", 1.9, true),
      store("plain-1.2", 1.2, false),
    ];

    expect(sortByProximityThenVerified(stores).map((s) => s.name)).toEqual([
      "verified-1.9",
      "plain-1.2",
    ]);
    expect(sortByProximityThenVerified(stores, 0.5).map((s) => s.name)).toEqual(
      ["plain-1.2", "verified-1.9"],
    );
  });

  it("sinks stores with no usable distance to the end", () => {
    const result = sortByProximityThenVerified([
      { name: "no-distance", is_verified: true },
      store("far", 40, false),
    ]);

    expect(result.map((s) => s.name)).toEqual(["far", "no-distance"]);
  });

  it("does not mutate the input", () => {
    const input = [store("far", 4.0, true), store("near", 0.3, false)];
    const before = input.map((s) => s.name);

    sortByProximityThenVerified(input);

    expect(input.map((s) => s.name)).toEqual(before);
  });

  it("returns an empty array for a non-array input", () => {
    expect(sortByProximityThenVerified(undefined)).toEqual([]);
  });
});
