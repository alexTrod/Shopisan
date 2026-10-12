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

// One spelling per city, in French like the cities collection. Keys are
// folded (no case, accents, spaces or punctuation), so "Milano", "MILANO" and
// "milano " all land on "Milan". Covers the other-language names that came
// from geocoding without a language and from owners typing the city by hand.
const fold = (s) =>
  `${s}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const CITY_SPELLINGS = Object.fromEntries(
  [
    ["Bruxelles", ["Brussels", "Brussel", "bxl"]],
    ["Milan", ["Milano"]],
    ["Florence", ["Firenze", "Fienze"]],
    ["Londres", ["London"]],
    ["Rome", ["Roma"]],
    ["Edimbourg", ["Edinburgh"]],
    ["Bologne", ["Bologna"]],
    ["Ravenne", ["Ravenna"]],
    ["Gênes", ["Genova"]],
    ["Gand", ["Gent"]],
    ["Anvers", ["Antwerpen", "Antwerp"]],
    ["Louvain", ["Leuven"]],
    ["Grenade", ["Granada"]],
    ["Mantoue", ["Mantova"]],
    ["Rhode-Saint-Genèse", ["Sint-Genesius-Rode"]],
    ["Watermael-Boitsfort", ["Watermaal-Bosvoorde"]],
    ["Aix-en-Provence", []],
    ["Romans-sur-Isère", []],
    ["Saint-Sébastien-sur-Loire", []],
    ["Les Sables-d'Olonne", ["Les Sables d'Olonnes"]],
    ["Perros-Guirec", []],
  ].flatMap(([name, others]) => [name, ...others].map((o) => [fold(o), name])),
);

/**
 * Clean up a typed city name before it is stored: trim, collapse inner
 * whitespace, map known spellings to the one in CITY_SPELLINGS, and
 * title-case names typed entirely in lower or upper case
 * ("toulouse", "TOULOUSE" -> "Toulouse", "saint-étienne" -> "Saint-Étienne").
 * Other mixed-case input is kept as typed. The cities collection matches
 * names exactly, so without this every variant became its own city.
 *
 * @param {string} name
 * @returns {string}
 */
export const normalizeCityName = (name) => {
  const cleaned = `${name ?? ""}`.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  const known = CITY_SPELLINGS[fold(cleaned)];
  if (known) return known;
  const isSingleCase =
    cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase();
  if (!isSingleCase) return cleaned;
  return cleaned
    .toLowerCase()
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
};

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
        name: normalizeCityName(city),
        postal_code: postalCode,
        country_id: countryId || DEFAULT_COUNTRY_ID,
      },
      // Firestore rejects `undefined` field values, so a store with no known
      // coordinates gets an empty geopoint rather than a failed write.
      geopoint: {
        ...(typeof latitude === "number" ? { latitude } : {}),
        ...(typeof longitude === "number" ? { longitude } : {}),
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
