/**
 * StoreContext Tests
 *
 * Renders the real provider against mocked services and covers:
 * - the source-priority guard (a city search always beats a late GPS fix)
 * - the Brussels default: dispatched, never cached, re-fetchable, one toast
 * - retry gating (only while on the default, never when permission denied)
 * - the late GPS listener and the stores:refresh cache bypass
 *
 * Run with: npx jest src/context/__tests__/StoreContext.test.js
 */

import React, { useContext } from "react";
import { AppState, DeviceEventEmitter } from "react-native";
import { render, act, waitFor } from "@testing-library/react-native";

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
  LocationState: {
    IDLE: "idle",
    ACQUIRED: "acquired",
    USE_CACHE: "use_cache",
    SEARCH_LOCATION: "search_location",
  },
}));

// Mock Redux: the provider reads Redux both through hooks and through
// store.getState(), so both go to the same mutable state.
const mockDispatch = jest.fn();
const mockGetState = jest.fn();
jest.mock("../../Redux", () => ({
  store: {
    getState: () => mockGetState(),
    dispatch: (...args) => mockDispatch(...args),
  },
}));
jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(mockGetState()),
  useDispatch: () => mockDispatch,
}));

jest.mock("../../Redux/Actions/LocationActions", () => ({
  setCustomLocation: jest.fn((location, source) => ({
    type: "SET_CUSTOM_LOCATION",
    payload: { ...location, source },
  })),
}));

jest.mock("../../utils/useTranslation", () => ({
  useTranslation: () => ({ t: (key) => key, locale: "en" }),
}));

// Mock LocationManager
const mockLocationListeners = new Set();
const mockLocationManager = {
  permissionStatus: null,
  refreshPermissionStatus: jest.fn(async () => mockLocationManager.permissionStatus),
  initialize: jest.fn().mockResolvedValue(undefined),
  getUserLocation: jest.fn(),
  setCustomLocation: jest.fn(),
  saveToCache: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn((listener) => {
    mockLocationListeners.add(listener);
    return () => mockLocationListeners.delete(listener);
  }),
};
// Getter: the hoisted import of StoreContext runs this factory before the
// const above is assigned.
jest.mock("../../services/LocationManager", () => ({
  __esModule: true,
  get default() {
    return mockLocationManager;
  },
}));

// Mock StoreService
const mockStoreService = {
  fetchAllStores: jest.fn().mockResolvedValue([]),
  refresh: jest.fn().mockResolvedValue([]),
  filterStoresByRadius: jest.fn().mockReturnValue([]),
  subscribe: jest.fn(() => jest.fn()),
};
jest.mock("../../services/StoreService", () => ({
  __esModule: true,
  get default() {
    return mockStoreService;
  },
}));

// Mock Toast
jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

import { LOCATION_CONFIG } from "../../config/location";
import { setCustomLocation } from "../../Redux/Actions/LocationActions";
import Toast from "react-native-toast-message";
import { StoreContext, StoreProvider, canGpsOverwrite } from "../StoreContext";

const GPS_FIX = {
  latitude: 50.717,
  longitude: 4.399,
  source: "gps",
  timestamp: 1,
};
// What userLocation holds once the fix has gone through Redux.
const GPS_POSITION = {
  latitude: GPS_FIX.latitude,
  longitude: GPS_FIX.longitude,
  source: "gps",
};

const SEARCH_LOCATION = {
  latitude: 48.8566,
  longitude: 2.3522,
  source: "search",
};

const DEFAULT_IN_REDUX = {
  ...LOCATION_CONFIG.DEFAULT_LOCATION,
  source: "default",
};

/** Mutable Redux state shared by the hook mock and store.getState(). */
let reduxState;
const setReduxLocation = (customLocation) => {
  reduxState = {
    location: { customLocation },
    categories: { selectedCategories: [] },
  };
};

/** Renders the provider and hands back the latest context value. */
const renderProvider = () => {
  const ctx = { current: null };
  const Probe = () => {
    ctx.current = useContext(StoreContext);
    return null;
  };
  render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  );
  return ctx;
};

const dispatchedSources = () =>
  mockDispatch.mock.calls.map(([action]) => action.payload.source);

const emitLocation = (state, location) =>
  act(() => {
    mockLocationListeners.forEach((listener) => listener(state, location));
  });

describe("StoreContext", () => {
  let appStateHandlers;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationListeners.clear();
    mockLocationManager.permissionStatus = null;
    setReduxLocation(null);
    mockGetState.mockImplementation(() => reduxState);
    // Behave like the reducer so the provider's Redux sync sees dispatches.
    mockDispatch.mockImplementation((action) => {
      if (action?.type === "SET_CUSTOM_LOCATION") {
        setReduxLocation({ ...action.payload, timestamp: Date.now() });
      }
    });
    appStateHandlers = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, handler) => {
      appStateHandlers.push(handler);
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    AppState.addEventListener.mockRestore();
  });

  describe("canGpsOverwrite (source-priority guard)", () => {
    it("lets GPS fill an empty location", () => {
      expect(canGpsOverwrite(null)).toBe(true);
      expect(canGpsOverwrite({})).toBe(true);
    });

    it("lets GPS overwrite a previous GPS fix and the default", () => {
      expect(canGpsOverwrite({ latitude: 45, longitude: 9, source: "gps" })).toBe(
        true,
      );
      expect(canGpsOverwrite(DEFAULT_IN_REDUX)).toBe(true);
    });

    it("never lets GPS overwrite a city the user searched for", () => {
      expect(canGpsOverwrite(SEARCH_LOCATION)).toBe(false);
    });

    it("never lets GPS overwrite an unknown or cached source", () => {
      // findClosestStore must therefore never dispatch those sources: they
      // would sit in Redux forever.
      expect(canGpsOverwrite({ latitude: 1, longitude: 1, source: "unknown" })).toBe(
        false,
      );
      expect(canGpsOverwrite({ latitude: 1, longitude: 1, source: "cache" })).toBe(
        false,
      );
    });
  });

  describe("initial location fetch", () => {
    it("uses a searched city from Redux and skips GPS", async () => {
      setReduxLocation(SEARCH_LOCATION);

      const ctx = renderProvider();

      await waitFor(() =>
        expect(ctx.current.userLocation).toMatchObject(SEARCH_LOCATION),
      );
      expect(mockLocationManager.getUserLocation).not.toHaveBeenCalled();
    });

    it("does not let a default in Redux short-circuit the GPS attempt", async () => {
      // The default is a fallback, not a choice: a persisted or earlier
      // default must not block the real position on the next fetch.
      setReduxLocation(DEFAULT_IN_REDUX);
      mockLocationManager.getUserLocation.mockResolvedValue(GPS_FIX);

      const ctx = renderProvider();

      await waitFor(() =>
        expect(mockLocationManager.getUserLocation).toHaveBeenCalledWith({
          useCache: true,
        }),
      );
      await waitFor(() =>
        expect(ctx.current.userLocation).toMatchObject(GPS_POSITION),
      );
      expect(dispatchedSources()).toEqual(["gps"]);
    });

    it("does not dispatch a GPS fix that lands after the user searched", async () => {
      let resolveGps;
      mockLocationManager.getUserLocation.mockReturnValue(
        new Promise((resolve) => {
          resolveGps = resolve;
        }),
      );

      const ctx = renderProvider();
      await waitFor(() =>
        expect(mockLocationManager.getUserLocation).toHaveBeenCalled(),
      );

      // User searches for a city while GPS is still pending
      setReduxLocation(SEARCH_LOCATION);
      await act(async () => {
        resolveGps(GPS_FIX);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      // The list stays centred on the searched city, not the GPS fix.
      expect(ctx.current.userLocation?.source).not.toBe("gps");
    });
  });

  describe("default location fallback", () => {
    it("falls back to Brussels, dispatches it as default and never caches it", async () => {
      mockLocationManager.getUserLocation.mockResolvedValue(null);

      const ctx = renderProvider();

      await waitFor(() =>
        expect(ctx.current.userLocation).toMatchObject({
          latitude: LOCATION_CONFIG.DEFAULT_LOCATION.latitude,
          longitude: LOCATION_CONFIG.DEFAULT_LOCATION.longitude,
          source: "default",
        }),
      );
      expect(setCustomLocation).toHaveBeenCalledWith(
        {
          latitude: LOCATION_CONFIG.DEFAULT_LOCATION.latitude,
          longitude: LOCATION_CONFIG.DEFAULT_LOCATION.longitude,
        },
        "default",
      );
      expect(mockLocationManager.saveToCache).not.toHaveBeenCalled();
    });

    it("also falls back, without caching, when the location request throws", async () => {
      mockLocationManager.getUserLocation.mockRejectedValue(new Error("boom"));

      const ctx = renderProvider();

      await waitFor(() =>
        expect(ctx.current.userLocation?.source).toBe("default"),
      );
      expect(mockLocationManager.saveToCache).not.toHaveBeenCalled();
    });

    it("does not overwrite a city search with the default", async () => {
      let resolveGps;
      mockLocationManager.getUserLocation.mockReturnValue(
        new Promise((resolve) => {
          resolveGps = resolve;
        }),
      );

      renderProvider();
      await waitFor(() =>
        expect(mockLocationManager.getUserLocation).toHaveBeenCalled(),
      );
      setReduxLocation(SEARCH_LOCATION);
      await act(async () => {
        resolveGps(null);
      });

      expect(dispatchedSources()).not.toContain("default");
    });

    it("shows the translated toast once, not on every retry", async () => {
      mockLocationManager.getUserLocation.mockResolvedValue(null);

      const ctx = renderProvider();
      await waitFor(() =>
        expect(ctx.current.userLocation?.source).toBe("default"),
      );

      expect(Toast.show).toHaveBeenCalledTimes(1);
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "info",
          text1: "location_not_available",
          text2: "search_your_city",
        }),
      );

      // Second fallback via the public refresh: still on the default
      await act(async () => {
        await ctx.current.refreshLocation();
      });

      expect(Toast.show).toHaveBeenCalledTimes(1);
    });
  });

  describe("retryLocationIfDefault", () => {
    const renderOnDefault = async () => {
      mockLocationManager.getUserLocation.mockResolvedValue(null);
      const ctx = renderProvider();
      await waitFor(() =>
        expect(ctx.current.userLocation?.source).toBe("default"),
      );
      setReduxLocation(DEFAULT_IN_REDUX);
      mockLocationManager.getUserLocation.mockClear();
      mockDispatch.mockClear();
      return ctx;
    };

    it("re-fetches GPS with forceRefresh and replaces the default", async () => {
      const ctx = await renderOnDefault();
      mockLocationManager.getUserLocation.mockResolvedValue(GPS_FIX);

      await act(async () => {
        await ctx.current.retryLocationIfDefault();
      });

      expect(mockLocationManager.getUserLocation).toHaveBeenCalledWith({
        forceRefresh: true,
      });
      expect(ctx.current.userLocation).toMatchObject(GPS_POSITION);
      expect(dispatchedSources()).toEqual(["gps"]);
    });

    it("does nothing while the permission is denied", async () => {
      const ctx = await renderOnDefault();
      mockLocationManager.permissionStatus = "denied";

      await act(async () => {
        await ctx.current.retryLocationIfDefault();
      });

      expect(mockLocationManager.getUserLocation).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("re-reads the permission so a grant from Settings is seen", async () => {
      const ctx = await renderOnDefault();
      // Cached status is stale ("denied"); the fresh read says granted.
      mockLocationManager.permissionStatus = "denied";
      mockLocationManager.refreshPermissionStatus.mockResolvedValueOnce(
        "granted",
      );
      mockLocationManager.getUserLocation.mockResolvedValue(GPS_FIX);

      await act(async () => {
        await ctx.current.retryLocationIfDefault();
      });

      expect(mockLocationManager.refreshPermissionStatus).toHaveBeenCalled();
      expect(ctx.current.userLocation).toMatchObject(GPS_POSITION);
    });

    it("does nothing when the location is not the default", async () => {
      mockLocationManager.getUserLocation.mockResolvedValue(GPS_FIX);
      const ctx = renderProvider();
      await waitFor(() =>
        expect(ctx.current.userLocation).toMatchObject(GPS_POSITION),
      );
      mockLocationManager.getUserLocation.mockClear();

      await act(async () => {
        await ctx.current.retryLocationIfDefault();
      });

      expect(mockLocationManager.getUserLocation).not.toHaveBeenCalled();
    });

    it("runs when the app comes back to the foreground", async () => {
      const ctx = await renderOnDefault();
      mockLocationManager.getUserLocation.mockResolvedValue(GPS_FIX);
      expect(appStateHandlers).toHaveLength(1);

      await act(async () => {
        appStateHandlers[0]("active");
      });

      await waitFor(() =>
        expect(ctx.current.userLocation).toMatchObject(GPS_POSITION),
      );
    });

    it("does not run on background transitions", async () => {
      await renderOnDefault();

      await act(async () => {
        appStateHandlers[0]("background");
      });

      expect(mockLocationManager.getUserLocation).not.toHaveBeenCalled();
    });
  });

  describe("late GPS fix from LocationManager", () => {
    it("is applied through the guard when the app sits on the default", async () => {
      mockLocationManager.getUserLocation.mockResolvedValue(null);
      const ctx = renderProvider();
      await waitFor(() =>
        expect(ctx.current.userLocation?.source).toBe("default"),
      );
      setReduxLocation(DEFAULT_IN_REDUX);
      mockDispatch.mockClear();

      emitLocation("acquired", GPS_FIX);

      expect(ctx.current.userLocation).toMatchObject(GPS_POSITION);
      expect(dispatchedSources()).toEqual(["gps"]);
    });

    it("never overwrites a city search", async () => {
      setReduxLocation(SEARCH_LOCATION);
      const ctx = renderProvider();
      await waitFor(() =>
        expect(ctx.current.userLocation).toMatchObject(SEARCH_LOCATION),
      );
      mockDispatch.mockClear();

      emitLocation("acquired", GPS_FIX);

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("ignores non-GPS notifications", async () => {
      mockLocationManager.getUserLocation.mockResolvedValue(null);
      const ctx = renderProvider();
      await waitFor(() =>
        expect(ctx.current.userLocation?.source).toBe("default"),
      );
      mockDispatch.mockClear();

      emitLocation("use_cache", { ...GPS_FIX, source: "cache" });
      emitLocation("search_location", { ...GPS_FIX, source: "custom" });

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("stores:refresh", () => {
    it("bypasses the store cache", async () => {
      mockLocationManager.getUserLocation.mockResolvedValue(GPS_FIX);
      renderProvider();
      await waitFor(() =>
        expect(mockStoreService.fetchAllStores).toHaveBeenCalledTimes(1),
      );

      await act(async () => {
        DeviceEventEmitter.emit("stores:refresh");
      });

      expect(mockStoreService.refresh).toHaveBeenCalledTimes(1);
      // The cache-first fetch must not be what a just-saved store triggers.
      expect(mockStoreService.fetchAllStores).toHaveBeenCalledTimes(1);
    });
  });

  describe("Source tracking", () => {
    it("setCustomLocation action should include source parameter", () => {
      const action = setCustomLocation(
        { latitude: 50.8503, longitude: 4.3517 },
        "search",
      );

      expect(action.type).toBe("SET_CUSTOM_LOCATION");
      expect(action.payload.source).toBe("search");
      expect(action.payload.latitude).toBe(50.8503);
    });

    it("setCustomLocation action should include gps source", () => {
      const action = setCustomLocation(
        { latitude: 45.4642, longitude: 9.19 },
        "gps",
      );

      expect(action.type).toBe("SET_CUSTOM_LOCATION");
      expect(action.payload.source).toBe("gps");
    });
  });
});
