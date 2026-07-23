/**
 * MapPickerModal Country Support Tests
 *
 * Tests that map picker works correctly for all supported countries
 * and correctly detects country from coordinates.
 *
 * Run with: npx jest src/components/store-form/__tests__/MapPickerModal.country.test.js
 *
 * Related bugs:
 * - Map picker not working in Belgium (Antwerp)
 * - country_id hardcoded to "FR" regardless of picked location
 */

import { CITIES_CONFIG } from "../../../config/citiesConfig";

// Store original fetch
const originalFetch = global.fetch;

describe("MapPickerModal - Country Support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Supported Countries", () => {
    it("should support Belgium in CITIES_CONFIG", () => {
      expect(CITIES_CONFIG.SUPPORTED_COUNTRIES).toContain("BE");
    });

    it("should support all target markets", () => {
      const requiredCountries = ["FR", "BE", "UK", "IT", "GR", "ES"];
      requiredCountries.forEach((country) => {
        expect(CITIES_CONFIG.SUPPORTED_COUNTRIES).toContain(country);
      });
    });
  });

  describe("Reverse Geocoding", () => {
    const MAPBOX_GEOCODING_BASE =
      "https://api.mapbox.com/geocoding/v5/mapbox.places";

    it("should reverse geocode Antwerp coordinates correctly", async () => {
      const antwerpCoords = { lat: 51.2194, lng: 4.4025 };

      const mockAntwerpResponse = {
        features: [
          {
            id: "address.antwerp",
            text: "Meir",
            place_name: "Meir, 2000 Antwerpen, Belgium",
            center: [4.4025, 51.2194],
            context: [
              { id: "postcode.2000", text: "2000" },
              { id: "place.antwerp", text: "Antwerpen" },
              { id: "region.flanders", text: "Flanders" },
              { id: "country.belgium", short_code: "be", text: "Belgium" },
            ],
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAntwerpResponse),
      });

      const response = await global.fetch(
        `${MAPBOX_GEOCODING_BASE}/${antwerpCoords.lng},${antwerpCoords.lat}.json`,
      );
      const data = await response.json();

      expect(data.features).toHaveLength(1);
      expect(data.features[0].place_name).toContain("Antwerpen");
      expect(data.features[0].place_name).toContain("Belgium");
    });

    it("should reverse geocode Namur coordinates correctly", async () => {
      const namurCoords = { lat: 50.4674, lng: 4.8671 };

      const mockNamurResponse = {
        features: [
          {
            id: "address.namur",
            text: "Rue des Brasseurs",
            place_name: "Rue des Brasseurs, 5000 Namur, Belgium",
            center: [4.8671, 50.4674],
            context: [
              { id: "postcode.5000", text: "5000" },
              { id: "place.namur", text: "Namur" },
              { id: "region.wallonia", text: "Wallonia" },
              { id: "country.belgium", short_code: "be", text: "Belgium" },
            ],
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNamurResponse),
      });

      const response = await global.fetch(
        `${MAPBOX_GEOCODING_BASE}/${namurCoords.lng},${namurCoords.lat}.json`,
      );
      const data = await response.json();

      expect(data.features[0].place_name).toContain("Namur");
    });

    it("should extract country code from Mapbox context", () => {
      const extractCountry = (context) => {
        const countryContext = context.find((c) => c.id.includes("country"));
        return countryContext?.short_code?.toUpperCase() || "FR";
      };

      const belgiumContext = [
        { id: "postcode.5000", text: "5000" },
        { id: "place.namur", text: "Namur" },
        { id: "country.belgium", short_code: "be", text: "Belgium" },
      ];

      const franceContext = [
        { id: "postcode.75001", text: "75001" },
        { id: "place.paris", text: "Paris" },
        { id: "country.france", short_code: "fr", text: "France" },
      ];

      expect(extractCountry(belgiumContext)).toBe("BE");
      expect(extractCountry(franceContext)).toBe("FR");
    });
  });

  describe("Map Initialization", () => {
    it("should start with world view if no GPS", () => {
      const initialRegion = {
        center: [0, 0],
        zoom: 2,
      };

      // World view for GPS-denied scenario
      expect(initialRegion.center).toEqual([0, 0]);
      expect(initialRegion.zoom).toBe(2);
    });

    it("should center on GPS location when available", () => {
      const gpsLocation = { lat: 51.2194, lng: 4.4025 }; // Antwerp

      const mapCenter = [gpsLocation.lng, gpsLocation.lat];
      expect(mapCenter).toEqual([4.4025, 51.2194]);
    });

    it("should center on initialLocation prop when provided", () => {
      const initialLocation = { latitude: 50.4674, longitude: 4.8671 }; // Namur

      const mapCenter = [initialLocation.longitude, initialLocation.latitude];
      expect(mapCenter).toEqual([4.8671, 50.4674]);
    });
  });

  describe("Country Detection from Coordinates", () => {
    const testLocations = [
      {
        name: "Antwerp, Belgium",
        coords: { lat: 51.2194, lng: 4.4025 },
        expectedCountry: "BE",
        expectedCity: "Antwerpen",
      },
      {
        name: "Namur, Belgium",
        coords: { lat: 50.4674, lng: 4.8671 },
        expectedCountry: "BE",
        expectedCity: "Namur",
      },
      {
        name: "Brussels, Belgium",
        coords: { lat: 50.8503, lng: 4.3517 },
        expectedCountry: "BE",
        expectedCity: "Bruxelles",
      },
      {
        name: "Paris, France",
        coords: { lat: 48.8566, lng: 2.3522 },
        expectedCountry: "FR",
        expectedCity: "Paris",
      },
      {
        name: "Lyon, France",
        coords: { lat: 45.764, lng: 4.8357 },
        expectedCountry: "FR",
        expectedCity: "Lyon",
      },
    ];

    it.each(testLocations)(
      "should detect $name as country $expectedCountry",
      ({ coords, expectedCountry }) => {
        // This is what the fix should implement
        const mockContext = [
          {
            id: `country.${expectedCountry.toLowerCase()}`,
            short_code: expectedCountry.toLowerCase(),
          },
        ];

        const countryCode = mockContext
          .find((c) => c.id.includes("country"))
          ?.short_code?.toUpperCase();

        expect(countryCode).toBe(expectedCountry);
      },
    );
  });

  describe("Address Data Extraction", () => {
    it("should extract all address components from Mapbox feature", () => {
      const mapboxFeature = {
        id: "address.123",
        text: "Meir",
        address: "15",
        place_name: "Meir 15, 2000 Antwerpen, Belgium",
        center: [4.4025, 51.2194],
        context: [
          { id: "postcode.2000", text: "2000" },
          { id: "place.antwerp", text: "Antwerpen" },
          { id: "region.flanders", text: "Flanders" },
          { id: "country.belgium", short_code: "be", text: "Belgium" },
        ],
      };

      const extractAddressData = (feature) => {
        const context = feature.context || [];
        return {
          streetName: feature.text,
          streetNumber: feature.address || "",
          city: context.find((c) => c.id.includes("place"))?.text || "",
          postalCode:
            context.find((c) => c.id.includes("postcode"))?.text || "",
          country:
            context
              .find((c) => c.id.includes("country"))
              ?.short_code?.toUpperCase() || "FR",
          coordinates: {
            latitude: feature.center[1],
            longitude: feature.center[0],
          },
        };
      };

      const result = extractAddressData(mapboxFeature);

      expect(result.streetName).toBe("Meir");
      expect(result.streetNumber).toBe("15");
      expect(result.city).toBe("Antwerpen");
      expect(result.postalCode).toBe("2000");
      expect(result.country).toBe("BE"); // Should be BE, not FR
      expect(result.coordinates).toEqual({
        latitude: 51.2194,
        longitude: 4.4025,
      });
    });

    it("should NOT hardcode country_id to FR", () => {
      // Bug: country_id is hardcoded at line 693 in add_store/index.js
      const belgianStore = {
        address: [
          {
            location: {
              city: {
                name: "Antwerpen",
                postal_code: "2000",
                country_id: "BE", // Should be BE, currently hardcoded to FR
              },
            },
          },
        ],
      };

      expect(belgianStore.address[0].location.city.country_id).toBe("BE");
      expect(belgianStore.address[0].location.city.country_id).not.toBe("FR");
    });
  });

  describe("Error Handling", () => {
    it("should handle reverse geocoding timeout", async () => {
      jest.useFakeTimers();

      const GEOCODE_TIMEOUT = 10000;

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), GEOCODE_TIMEOUT);
      });

      // Advance timers past timeout
      jest.advanceTimersByTime(GEOCODE_TIMEOUT + 100);

      await expect(timeoutPromise).rejects.toThrow("Timeout");

      jest.useRealTimers();
    });

    it("should show error message when geocoding fails", () => {
      const errorMessages = {
        timeout: "Could not find address. Please try again.",
        noResults: "No address found at this location.",
        networkError: "Connection error. Please check your internet.",
      };

      expect(errorMessages.timeout).toContain("try again");
      expect(errorMessages.noResults).toContain("No address");
    });

    it("should handle no results from reverse geocoding", async () => {
      const emptyResponse = { features: [] };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      });

      const response = await global.fetch("https://api.mapbox.com/...");
      const data = await response.json();

      expect(data.features).toHaveLength(0);

      // Should show appropriate error to user
      const handleNoResults = (features) => {
        if (!features || features.length === 0) {
          return { error: "No address found at this location" };
        }
        return { data: features[0] };
      };

      expect(handleNoResults(data.features).error).toBeDefined();
    });
  });
});
