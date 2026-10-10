// Deterministic stand-ins for third-party HTTP APIs, installed only in the
// e2e build (EXPO_PUBLIC_E2E=1, see e2e/README.md). Geocoding, address
// autocomplete, image uploads and the production feedback endpoint answer
// from fixtures instead of the network, so e2e runs never depend on Google,
// Mapbox or Cloudflare, and never write to production.

// Must match e2e/seed/fixtures.mjs PLACES.
const PLACES = {
  lyon: { lat: 45.764, lng: 4.8357 },
  toulouse: { lat: 43.6047, lng: 1.4442 },
};

const LOCAL_IMAGE = "http://10.0.2.2:5005/logo.png";

const json = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const geocode = (url) => {
  // React Native's URL has no searchParams.
  const raw = (url.match(/[?&]address=([^&]*)/) || [])[1] || "";
  const address = decodeURIComponent(raw).toLowerCase();
  const place = address.includes("toulouse") ? PLACES.toulouse : PLACES.lyon;
  return json({
    status: "OK",
    results: [{ geometry: { location: place }, formatted_address: address }],
  });
};

const ROUTES = [
  { match: /^https:\/\/maps\.googleapis\.com\/maps\/api\/geocode\//, reply: geocode },
  { match: /^https:\/\/api\.mapbox\.com\/geocoding\//, reply: () => json({ type: "FeatureCollection", features: [] }) },
  {
    match: /^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[^/]+\/images\//,
    reply: () => json({ success: true, result: { id: "e2e-image", variants: [LOCAL_IMAGE] } }),
  },
  { match: /^https:\/\/[^/]*cloudfunctions\.net\//, reply: () => json({ success: true }) },
];

// expo-location's device geocoder (city search) bypasses fetch and asks
// Google Play services over the network. expo-location re-exports this
// module with live getters, so replacing the export here reaches every
// `Location.geocodeAsync` caller.
const installGeocoderFixture = () => {
  const LocationModule = require("expo-location/build/Location");
  LocationModule.geocodeAsync = async (address) => {
    const name = String(address || "").toLowerCase();
    const place = name.includes("toulouse") ? PLACES.toulouse : PLACES.lyon;
    return [{ latitude: place.lat, longitude: place.lng, accuracy: 1 }];
  };
};

export function installE2EFixtures() {
  installGeocoderFixture();
  const realFetch = global.fetch;
  global.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    const route = url && ROUTES.find((r) => r.match.test(url));
    return route ? Promise.resolve(route.reply(url, init)) : realFetch(input, init);
  };
}
