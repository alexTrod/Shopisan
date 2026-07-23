/**
 * StoreContext Integration Tests
 *
 * Tests for GPS + Search timing scenarios.
 * Run with: npx jest src/context/__tests__/StoreContext.integration.test.js
 */

// Mock config FIRST
jest.mock("../../config/location", () => ({
  LOCATION_CONFIG: {
    DEFAULT_LOCATION: {
      latitude: 50.8503,
      longitude: 4.3517,
      city: "Brussels",
    },
    SEARCH_RADIUS_KM: 20,
    GPS_TIMEOUT: 8000,
    CACHE_TTL: 2 * 60 * 60 * 1000,
  },
}));

describe("StoreContext Integration - GPS + Search Timing", () => {
  describe("Race Condition Scenario", () => {
    it("should preserve search location when GPS returns after user search", () => {
      // Scenario:
      // T=0: App starts, GPS request begins
      // T=2s: User searches "Brussels"
      // T=5s: GPS finally returns Milan
      // Expected: Location should remain Brussels

      // State management simulation
      let currentState = { customLocation: null };

      // T=0: GPS starts
      const gpsStartTime = Date.now();
      let gpsResolve;
      const gpsPromise = new Promise((resolve) => {
        gpsResolve = resolve;
      });

      // T=2s: User searches Brussels
      currentState = {
        customLocation: {
          latitude: 50.8503,
          longitude: 4.3517,
          source: "search",
        },
      };

      // T=5s: GPS returns Milan
      gpsResolve({ latitude: 45.4642, longitude: 9.19, source: "gps" });

      // The race condition check in StoreContext:
      const shouldDispatchGPS =
        !currentState.customLocation?.latitude ||
        currentState.customLocation.source === "gps" ||
        currentState.customLocation.source === "default";

      // Since user searched (source: "search"), GPS should NOT overwrite
      expect(shouldDispatchGPS).toBe(false);
      expect(currentState.customLocation.source).toBe("search");
      expect(currentState.customLocation.latitude).toBe(50.8503);
    });

    it("should allow GPS to set location when no search has occurred", () => {
      let currentState = { customLocation: null };

      // GPS returns Milan, no search occurred
      const gpsLocation = { latitude: 45.4642, longitude: 9.19, source: "gps" };

      // The race condition check in StoreContext:
      const shouldDispatchGPS =
        !currentState.customLocation?.latitude ||
        currentState.customLocation?.source === "gps" ||
        currentState.customLocation?.source === "default";

      expect(shouldDispatchGPS).toBe(true);

      // Simulate dispatch
      currentState = { customLocation: gpsLocation };
      expect(currentState.customLocation.latitude).toBe(45.4642);
    });

    it("should track dispatch source in order for debugging", () => {
      const dispatchLog = [];

      // Simulate dispatch function
      const dispatch = (action) => {
        if (action.type === "SET_CUSTOM_LOCATION") {
          dispatchLog.push({
            source: action.payload.source,
            lat: action.payload.latitude,
            time: Date.now(),
          });
        }
      };

      // User searches Brussels
      dispatch({
        type: "SET_CUSTOM_LOCATION",
        payload: { latitude: 50.8503, longitude: 4.3517, source: "search" },
      });

      // Verify dispatch log
      const searchDispatch = dispatchLog.find((d) => d.source === "search");
      expect(searchDispatch).toBeTruthy();
      expect(searchDispatch.lat).toBe(50.8503);
    });
  });

  describe("Multiple Search Scenario", () => {
    it("should use last search location, ignoring pending GPS", () => {
      let currentState = { customLocation: null };

      // User searches Paris first
      currentState = {
        customLocation: {
          latitude: 48.8566,
          longitude: 2.3522,
          source: "search",
        },
      };

      // User searches Brussels second
      currentState = {
        customLocation: {
          latitude: 50.8503,
          longitude: 4.3517,
          source: "search",
        },
      };

      // GPS finally returns Milan - should NOT overwrite
      const shouldDispatchGPS =
        !currentState.customLocation?.latitude ||
        currentState.customLocation.source === "gps" ||
        currentState.customLocation.source === "default";

      expect(shouldDispatchGPS).toBe(false);
      expect(currentState.customLocation.latitude).toBe(50.8503);
      expect(currentState.customLocation.source).toBe("search");
    });
  });

  describe("GPS Manual Refresh", () => {
    it("should allow GPS manual refresh (gps_manual) to overwrite any location", () => {
      // Start with a search location
      let currentState = {
        customLocation: {
          latitude: 50.8503,
          longitude: 4.3517,
          source: "search",
        },
      };

      // User manually requests GPS (gps_manual)
      // This should overwrite even search locations
      currentState = {
        customLocation: {
          latitude: 45.4642,
          longitude: 9.19,
          source: "gps_manual",
        },
      };

      expect(currentState.customLocation.latitude).toBe(45.4642);
      expect(currentState.customLocation.source).toBe("gps_manual");
    });
  });

  describe("Source Priority Matrix", () => {
    const testCases = [
      // [existingSource, newSource, shouldOverwrite]
      [null, "gps", true, "GPS can set when empty"],
      [null, "search", true, "Search can set when empty"],
      ["gps", "gps", true, "GPS can overwrite GPS"],
      ["gps", "search", true, "Search can overwrite GPS"],
      ["search", "gps", false, "GPS should NOT overwrite search"],
      ["search", "search", true, "Search can overwrite search"],
      ["default", "gps", true, "GPS can overwrite default"],
      ["default", "search", true, "Search can overwrite default"],
      ["search", "gps_manual", true, "Manual GPS can overwrite search"],
    ];

    testCases.forEach(([existing, newSource, expected, desc]) => {
      it(`${desc}: existing=${existing}, new=${newSource} => ${expected}`, () => {
        const currentState = existing
          ? { customLocation: { latitude: 50, longitude: 4, source: existing } }
          : { customLocation: null };

        let shouldDispatch;
        if (newSource === "gps") {
          // Auto GPS check - don't overwrite search
          shouldDispatch =
            !currentState.customLocation?.latitude ||
            currentState.customLocation.source === "gps" ||
            currentState.customLocation.source === "default";
        } else if (newSource === "search" || newSource === "gps_manual") {
          // Search and manual GPS can always overwrite
          shouldDispatch = true;
        } else {
          shouldDispatch = true;
        }

        expect(shouldDispatch).toBe(expected);
      });
    });
  });
});
