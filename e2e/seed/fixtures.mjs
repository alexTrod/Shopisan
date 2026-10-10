// Seed data for the e2e suite. Every flow starts from an empty emulator and
// gets exactly the world built here: fixed uids, emails, coordinates and ids,
// so a run never depends on what an earlier flow left behind.
//
// Field shapes mirror what the app itself writes:
//   users  -> signUp / signUpMerchantWithStore (src/Redux/Actions/UserActions.js)
//   stores -> signUpMerchantWithStore + buildStoreAddress (src/utils/storeAddress.js)
//   cities -> ensureCityExists (src/utils/cityManagement.js)
//   posts  -> PostService.createPost (src/services/PostService.js)

export const PASSWORD = "e2e-pass-123";

// Fixed points. Lyon has an approved store; Toulouse (~360 km away, beyond
// the app's 200 km radius expansion) has none.
export const PLACES = {
  lyon: { latitude: 45.764, longitude: 4.8357, city: "Lyon", postalCode: "69002" },
  toulouse: { latitude: 43.6047, longitude: 1.4442, city: "Toulouse", postalCode: "31000" },
};

// The hosting emulator serves public/ to the Android emulator, so post images
// load locally instead of from Cloudflare.
const LOCAL_IMAGE = "http://10.0.2.2:5005/logo.png";

const city = (place, idx) => ({
  id: `city-${place.city.toLowerCase()}`,
  data: {
    name: { fr: place.city, en: place.city, es: place.city, it: place.city },
    country_id: "FR",
    coordinates: { latitude: place.latitude, longitude: place.longitude },
    geohash: "",
    postal_codes: [place.postalCode],
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    migrated: false,
    added_automatically: true,
    store_count: idx,
  },
});

const user = ({ uid, email, username, userType = "user", merchantStatus, admin = false, language = "fr", extra = {} }) => ({
  uid,
  email,
  password: PASSWORD,
  admin,
  doc: {
    userType,
    signupIntent: userType,
    ...(merchantStatus ? { merchantStatus } : {}),
    id: uid,
    user_id: uid,
    email,
    username,
    language,
    date_of_birth: null,
    is_validated: true,
    is_active: true,
    is_admin: admin,
    emailVerificationStatus: "verified",
    termsAcceptedAt: new Date("2026-01-01T00:00:00Z"),
    last_login: new Date("2026-01-01T00:00:00Z"),
    created: new Date("2026-01-01T00:00:00Z"),
    picture_id: null,
    ...extra,
  },
});

const owner = (o) =>
  user({
    ...o,
    userType: "owner",
    extra: { name: o.first || "Owner", surname: o.last || "E2E", phone: "0600000000", companyNumber: "12345678900012" },
  });

const store = ({ docId, id, name, ownerId, place, status = "approved", extra = {} }) => ({
  id: docId,
  data: {
    id,
    name,
    owner_id: ownerId,
    address: [
      {
        location: {
          address: { street: "Rue de la République", streetNumber: "10" },
          city: { name: place.city, postal_code: place.postalCode, country_id: "FR" },
          geopoint: { latitude: place.latitude, longitude: place.longitude },
        },
      },
    ],
    latitude: place.latitude,
    longitude: place.longitude,
    cityName: place.city,
    description: { fr: `${name} — boutique de test` },
    category: [1],
    storeStatus: 0,
    website: "",
    openingHours: {},
    images: [],
    imageUrl: "",
    is_validated: true,
    status,
    created: new Date("2026-01-02T00:00:00Z"),
    email: `${docId}@e2e.test`,
    phone: "0600000000",
    managerFirstName: "Owner",
    managerLastName: "E2E",
    ...extra,
  },
});

// --- Shared cast -----------------------------------------------------------

const ADMIN = user({ uid: "admin-1", email: "admin@e2e.test", username: "admin", admin: true });
const SHOPPER = user({ uid: "shopper-1", email: "shopper@e2e.test", username: "shopper" });
const OWNER_APPROVED = owner({ uid: "owner-approved", email: "owner.approved@e2e.test", username: "ownerapproved", merchantStatus: "approved" });
const OWNER_PENDING = owner({ uid: "owner-pending", email: "owner.pending@e2e.test", username: "ownerpending", merchantStatus: "pending" });

const LYON_STORE = store({ docId: "store-lyon", id: 1, name: "Boulangerie Lyon", ownerId: OWNER_APPROVED.uid, place: PLACES.lyon });

// store_categories, read by getCategoriesLocale (src/Redux/Reducers/CategoriesReducer.js).
const CATEGORIES = [
  { id: "cat-1", data: { id: 1, sort_id: 1, name: { fr: "Alimentation", en: "Food" } } },
  { id: "cat-2", data: { id: 2, sort_id: 2, name: { fr: "Fleurs", en: "Flowers" } } },
  { id: "cat-3", data: { id: 3, sort_id: 3, name: { fr: "Librairie", en: "Books" } } },
];

const base = () => ({
  users: [ADMIN],
  categories: CATEGORIES,
  cities: [city(PLACES.lyon, 1), city(PLACES.toulouse, 0)],
  stores: [LYON_STORE],
  posts: [],
  location: PLACES.lyon,
});

// --- Per-flow worlds ---------------------------------------------------------

export const WORLDS = {
  // F1: nobody signed up yet; the flow creates the shopper itself.
  "shopper-signup": () => base(),

  // F2: nobody signed up yet; the flow creates the owner itself.
  "owner-signup": () => base(),

  // F3: one owner waiting for approval (with their store), and one approved
  // owner who added a second store that is still pending review.
  "admin-approval": () => {
    const w = base();
    w.users.push(OWNER_PENDING, OWNER_APPROVED);
    w.stores.push(
      store({ docId: "store-pending-owner", id: 2, name: "Fleuriste En Attente", ownerId: OWNER_PENDING.uid, place: PLACES.lyon, status: "pending" }),
      store({ docId: "store-approved-owner-new", id: 3, name: "Librairie Nouvelle", ownerId: OWNER_APPROVED.uid, place: PLACES.lyon, status: "pending" }),
    );
    return w;
  },

  // F4: an owner still waiting; the flow approves them mid-run (as the admin
  // would) and they continue from the pending screen with "Check again".
  "owner-approved-adds-store": () => {
    const w = base();
    const waiting = owner({ uid: "owner-new", email: "owner.new@e2e.test", username: "ownernew", merchantStatus: "pending" });
    w.users.push(waiting);
    w.stores.push(store({ docId: "store-owner-new", id: 2, name: "Épicerie Approuvée", ownerId: waiting.uid, place: PLACES.lyon, status: "pending" }));
    return w;
  },

  // F5: shopper whose location is Toulouse, where no shop exists.
  "empty-city": () => {
    const w = base();
    w.users.push(SHOPPER);
    w.location = PLACES.toulouse;
    return w;
  },

  // F6: approved owner with one post, so Manage Posts shows the header button.
  "posts-fr": () => {
    const w = base();
    w.users.push(OWNER_APPROVED);
    w.posts.push({
      id: "post-1",
      data: {
        store: { id: LYON_STORE.data.id },
        owner_id: OWNER_APPROVED.uid,
        images: [LOCAL_IMAGE],
        description: { fr: "Croissants du jour" },
        price: 2,
        currency: { code: "EUR", symbol: "€" },
        createdAt: new Date("2026-01-03T00:00:00Z"),
        updatedAt: new Date("2026-01-03T00:00:00Z"),
      },
    });
    return w;
  },

  // F7: signed-out device, the email link must bring the app up.
  "open-link": () => base(),

  // F8: plain shopper for login / logout / guest.
  "login-guest": () => {
    const w = base();
    w.users.push(SHOPPER);
    return w;
  },
};

export const CAST = { ADMIN, SHOPPER, OWNER_APPROVED, OWNER_PENDING };
