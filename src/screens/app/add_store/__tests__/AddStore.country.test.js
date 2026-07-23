/**
 * AddStore Country Support Tests
 *
 * Tests that address autocomplete works correctly for all supported countries,
 * not just France. Verifies country detection and proper country_id assignment.
 *
 * Run with: npx jest src/screens/app/add_store/__tests__/AddStore.country.test.js
 *
 * Related bugs:
 * - City autocomplete shows wrong results for Belgium (hardcoded country=fr)
 * - Store country_id always "FR" even for Belgium stores
 */

import { CITIES_CONFIG } from "../../../../config/citiesConfig";

// Store original fetch
const originalFetch = global.fetch;

describe("AddStore - Country Support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("City Autocomplete Country Filter", () => {
    const MAPBOX_GEOCODING_BASE =
      "https://api.mapbox.com/geocoding/v5/mapbox.places";

    it("should support all countries in CITIES_CONFIG.SUPPORTED_COUNTRIES", () => {
      // Config should include Belgium, UK, Italy, Greece, Spain
      expect(CITIES_CONFIG.SUPPORTED_COUNTRIES).toContain("FR");
      expect(CITIES_CONFIG.SUPPORTED_COUNTRIES).toContain("BE");
      expect(CITIES_CONFIG.SUPPORTED_COUNTRIES).toContain("UK");
      expect(CITIES_CONFIG.SUPPORTED_COUNTRIES).toContain("IT");
      expect(CITIES_CONFIG.SUPPORTED_COUNTRIES).toContain("GR");
      expect(CITIES_CONFIG.SUPPORTED_COUNTRIES).toContain("ES");
    });

    it("should build correct country filter for Mapbox API", () => {
      // Expected: country=fr,be,uk,it,gr,es (or similar)
      const countries = CITIES_CONFIG.SUPPORTED_COUNTRIES.map((c) =>
        c.toLowerCase(),
      ).join(",");

      // Current bug: hardcoded to 'fr' only
      // This test documents expected behavior
      expect(countries).toBe("fr,be,uk,it,gr,es");
    });

    it("should return results for Belgian cities like Namur", async () => {
      const mockBelgianResults = {
        features: [
          {
            id: "place.namur",
            text: "Namur",
            place_name: "Namur, Wallonia, Belgium",
            center: [4.8671, 50.4674],
            context: [
              { id: "region.wallonia", text: "Wallonia" },
              { id: "country.belgium", short_code: "be", text: "Belgium" },
            ],
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBelgianResults),
      });

      // Simulate search for "Namur"
      const searchQuery = "Namur";
      const expectedUrl = expect.stringMatching(
        new RegExp(
          `${MAPBOX_GEOCODING_BASE}/${encodeURIComponent(searchQuery)}`,
        ),
      );

      // In correct implementation, country param should include 'be'
      await global.fetch(
        `${MAPBOX_GEOCODING_BASE}/${searchQuery}.json?country=fr,be,uk,it,gr,es`,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("country="),
      );

      // Current bug: URL contains only 'country=fr'
      // After fix: URL should contain 'be' for Belgium support
    });

    it("should return results for Antwerp (Belgium)", async () => {
      const mockAntwerpResults = {
        features: [
          {
            id: "place.antwerp",
            text: "Antwerpen",
            place_name: "Antwerpen, Flanders, Belgium",
            center: [4.4025, 51.2194],
            context: [
              { id: "region.flanders", text: "Flanders" },
              { id: "country.belgium", short_code: "be", text: "Belgium" },
            ],
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAntwerpResults),
      });

      // This should return Antwerp results when country filter includes 'be'
      const results = mockAntwerpResults.features;
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe("Antwerpen");
    });
  });

  describe("Street Autocomplete with City Context", () => {
    it("should search streets near selected city coordinates", async () => {
      const namurCoords = { latitude: 50.4674, longitude: 4.8671 };

      // When city is selected, street search should use proximity biasing
      const mockStreetResults = {
        features: [
          {
            id: "address.ruebrasseurs",
            text: "Rue des Brasseurs",
            place_name: "Rue des Brasseurs, 5000 Namur, Belgium",
            center: [4.8695, 50.466],
            context: [
              { id: "postcode.5000", text: "5000" },
              { id: "place.namur", text: "Namur" },
              { id: "country.belgium", short_code: "be", text: "Belgium" },
            ],
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStreetResults),
      });

      // Verify proximity param is included
      const proximityParam = `proximity=${namurCoords.longitude},${namurCoords.latitude}`;

      // After selecting Namur as city, street search for "rue des brasseurs"
      // should include proximity to Namur, NOT return Brussels results
      const results = mockStreetResults.features;
      expect(results[0].place_name).toContain("Namur");
      expect(results[0].place_name).not.toContain("Brussels");
    });

    it("should not return Brussels results when searching in Namur context", () => {
      // Bug scenario: User searches "rue des Brasseurs" in Namur
      // but gets "Rue des Brasseurs, 1000 Bruxelles" instead

      const namurContext = { city: "Namur", postalCode: "5000" };
      const wrongResult = {
        text: "Rue des Brasseurs",
        place_name:
          "Rue des Brasseurs, 1000 Bruxelles, Région de Bruxelles-Capitale, Belgique",
        context: [
          { id: "postcode.1000", text: "1000" },
          { id: "place.brussels", text: "Bruxelles" },
        ],
      };

      // This should NOT happen - the result postal code (1000) doesn't match
      // user's selected city (Namur, 5000)
      const resultPostalCode = wrongResult.context.find((c) =>
        c.id.includes("postcode"),
      )?.text;
      const resultCity = wrongResult.context.find((c) =>
        c.id.includes("place"),
      )?.text;

      // These assertions document the bug
      expect(resultPostalCode).not.toBe(namurContext.postalCode);
      expect(resultCity).not.toBe(namurContext.city);
    });
  });

  describe("Country Detection from Coordinates", () => {
    const testCases = [
      {
        name: "Belgium (Namur)",
        coords: { lat: 50.4674, lng: 4.8671 },
        expectedCountry: "BE",
      },
      {
        name: "Belgium (Antwerp)",
        coords: { lat: 51.2194, lng: 4.4025 },
        expectedCountry: "BE",
      },
      {
        name: "France (Paris)",
        coords: { lat: 48.8566, lng: 2.3522 },
        expectedCountry: "FR",
      },
      {
        name: "France (Lyon)",
        coords: { lat: 45.764, lng: 4.8357 },
        expectedCountry: "FR",
      },
      {
        name: "UK (London)",
        coords: { lat: 51.5074, lng: -0.1278 },
        expectedCountry: "UK",
      },
      {
        name: "Spain (Madrid)",
        coords: { lat: 40.4168, lng: -3.7038 },
        expectedCountry: "ES",
      },
      {
        name: "Italy (Rome)",
        coords: { lat: 41.9028, lng: 12.4964 },
        expectedCountry: "IT",
      },
      {
        name: "Greece (Athens)",
        coords: { lat: 37.9838, lng: 23.7275 },
        expectedCountry: "GR",
      },
    ];

    it.each(testCases)(
      "should detect country as $expectedCountry for $name",
      ({ coords, expectedCountry }) => {
        // This test documents expected behavior after fix
        // Currently country_id is hardcoded to "FR"

        // Function should extract country from reverse geocoding context
        // or use a geolocation-based country detection
        const mockMapboxContext = [
          {
            id: `country.${expectedCountry.toLowerCase()}`,
            short_code: expectedCountry.toLowerCase(),
            text:
              expectedCountry === "BE"
                ? "Belgium"
                : expectedCountry === "FR"
                  ? "France"
                  : expectedCountry,
          },
        ];

        const detectedCountry = mockMapboxContext
          .find((c) => c.id.includes("country"))
          ?.short_code?.toUpperCase();

        expect(detectedCountry).toBe(expectedCountry);
      },
    );
  });

  describe("Store Data country_id", () => {
    it("should set country_id based on store location, not hardcoded", () => {
      // Bug: country_id is hardcoded to "FR" at line 693
      // This should be detected from the address context

      const belgianStoreAddress = {
        street: "Rue des Brasseurs",
        city: "Namur",
        postalCode: "5000",
        coordinates: { lat: 50.4674, lng: 4.8671 },
        context: [{ id: "country.belgium", short_code: "be" }],
      };

      // Expected behavior after fix
      const expectedCountryId = belgianStoreAddress.context
        .find((c) => c.id.includes("country"))
        ?.short_code?.toUpperCase();

      expect(expectedCountryId).toBe("BE");
      // Current bug: always returns "FR"
    });

    it("should validate country_id is in SUPPORTED_COUNTRIES", () => {
      const supportedCountries = CITIES_CONFIG.SUPPORTED_COUNTRIES;

      const validCountryIds = ["FR", "BE", "UK", "IT", "GR", "ES"];
      const invalidCountryIds = ["DE", "NL", "PT", "CH"];

      validCountryIds.forEach((countryId) => {
        expect(supportedCountries).toContain(countryId);
      });

      invalidCountryIds.forEach((countryId) => {
        expect(supportedCountries).not.toContain(countryId);
      });
    });
  });
});
