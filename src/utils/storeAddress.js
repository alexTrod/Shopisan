/**
 * Store address shape helpers.
 *
 * A store's address is a single-element array wrapping a deeply nested
 * location object. That shape was built by hand in three places (add_store,
 * handle_store and useStoreForm), which is how `streetNumber` came to be
 * written in some paths and dropped in others.
 *
 * Keep reads and writes going through here so the shape stays in one place.
 */

const DEFAULT_COUNTRY_ID = "FR";

/**
 * Build the `address` array stored on a store document.
 *
 * @param {Object} params
 * @param {string} [params.street]
 * @param {string} [params.streetNumber]
 * @param {string} [params.city]
 * @param {string} [params.postalCode]
 * @param {string} [params.countryId] - ISO code; defaults to FR when unknown
 * @param {number} [params.latitude]
 * @param {number} [params.longitude]
 * @returns {Array<Object>} the address array
 */
export const buildStoreAddress = ({
  street = "",
  streetNumber = "",
  city = "",
  postalCode = "",
  countryId,
  latitude,
  longitude,
} = {}) => [
  {
    location: {
      address: {
        street: `${street}`,
        streetNumber: `${streetNumber}`,
      },
      city: {
        name: city,
        postal_code: postalCode,
        country_id: countryId || DEFAULT_COUNTRY_ID,
      },
      geopoint: {
        latitude,
        longitude,
      },
    },
  },
];

/**
 * Read the address fields back off a store document.
 *
 * Tolerates legacy documents with no address array and missing sub-fields —
 * every string field falls back to "" so form inputs stay controlled.
 *
 * @param {Object} store - a store document
 * @returns {Object} flat address fields
 */
export const readStoreAddress = (store) => {
  const location = store?.address?.[0]?.location;

  return {
    street: location?.address?.street || "",
    streetNumber: location?.address?.streetNumber || "",
    city: location?.city?.name || "",
    postalCode: location?.city?.postal_code || "",
    countryId: location?.city?.country_id || "",
    latitude: location?.geopoint?.latitude,
    longitude: location?.geopoint?.longitude,
  };
};
