/**
 * Ordering rules for store lists.
 *
 * Kept out of storeUtils on purpose: that module imports firebase/firestore at
 * load time, which drags the whole SDK into any test that touches it. These are
 * pure functions over plain objects and should stay cheap to import and test.
 *
 * This is the only place the verification badge is allowed to reorder anything.
 * StoreService.filterStoresByRadius stays strictly distance-sorted because its
 * callers read the first element as "the nearest shop".
 */

const DEFAULT_PROXIMITY_BUCKET_KM = 2;

/**
 * Sort verified stores ahead of unverified ones, preserving the order within
 * each group.
 *
 * Use this where the list has no meaningful distance to fall back on -- search
 * suggestions, or a city list viewed without a user location.
 *
 * @param {Array} stores
 * @returns {Array} A new array; the input is not mutated.
 */
export const sortVerifiedFirst = (stores) => {
  if (!Array.isArray(stores)) return [];

  return [...stores].sort((a, b) => {
    // Coerced with ! so a missing field sorts the same as an explicit false.
    if (!a?.is_verified !== !b?.is_verified) return a?.is_verified ? -1 : 1;
    return 0;
  });
};

/**
 * Sort by rough distance band first, then by verification, then by exact
 * distance.
 *
 * Strict verified-first would be wrong for a proximity marketplace: it puts a
 * verified shop 18 km away above an unverified one 300 m away. Bucketing keeps
 * distance in charge across any gap a shopper would notice, and lets the badge
 * decide only between stores that are effectively equally close.
 *
 * Stores with no `distance` (nothing to compare) sink to the end.
 *
 * @param {Array} stores - Stores carrying a numeric `distance` in km
 * @param {number} bucketKm - Width of a distance band
 * @returns {Array} A new array; the input is not mutated.
 */
export const sortByProximityThenVerified = (
  stores,
  bucketKm = DEFAULT_PROXIMITY_BUCKET_KM,
) => {
  if (!Array.isArray(stores)) return [];

  const bucketOf = (store) => {
    const distance = Number(store?.distance);
    if (!Number.isFinite(distance)) return Infinity;
    return Math.ceil(distance / bucketKm);
  };

  return [...stores].sort((a, b) => {
    const bucketA = bucketOf(a);
    const bucketB = bucketOf(b);
    if (bucketA !== bucketB) return bucketA - bucketB;

    if (!a?.is_verified !== !b?.is_verified) return a?.is_verified ? -1 : 1;

    const distA = Number(a?.distance);
    const distB = Number(b?.distance);
    if (!Number.isFinite(distA) || !Number.isFinite(distB)) return 0;
    return distA - distB;
  });
};
