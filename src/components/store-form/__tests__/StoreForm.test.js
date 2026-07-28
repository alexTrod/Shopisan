/**
 * StoreForm Tests
 *
 * Covers the store/merchant form fixes: the image editor is reachable,
 * merchant contact fields are required, fields render in the agreed order,
 * and city autocomplete behaves like the street one.
 *
 * Run with: npx jest src/components/store-form/__tests__/StoreForm.test.js
 */

import React from "react";
import { render, act, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert, TextInput } from "react-native";

// Mock Mapbox - StoreForm calls setAccessToken at module scope
jest.mock("@rnmapbox/maps", () => ({
  __esModule: true,
  default: {
    setAccessToken: jest.fn(),
    MapView: "MapView",
    Camera: "Camera",
    PointAnnotation: "PointAnnotation",
  },
}));

// Mock vector icons
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return {
    Ionicons: ({ name }) =>
      React.createElement("View", { testID: `icon-${name}` }),
  };
});

// Mock Redux
const mockDispatch = jest.fn();
let mockSelectedCategories = [];
jest.mock("react-redux", () => ({
  useSelector: jest.fn((selector) =>
    selector({
      user: { userData: { id: "owner-uid", email: "owner@example.com" } },
      categories: {
        categories: [{ id: "cat1", name: "Bakery" }],
        selectedCategories: mockSelectedCategories,
      },
    }),
  ),
  useDispatch: () => mockDispatch,
}));

// Mock Firebase
jest.mock("../../../../firebaseconfig", () => ({
  firestore: {},
  functions: {},
}));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: "new-store" })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [], forEach: jest.fn() })),
  doc: jest.fn(),
  getDoc: jest.fn(() =>
    Promise.resolve({ exists: () => true, data: () => ({ id: "owner-uid" }) }),
  ),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock("firebase/functions", () => ({ httpsCallable: jest.fn() }));

// Mock expo-location
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "denied" }),
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 48.8566, longitude: 2.3522 } }),
  ),
}));

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

// Mock categories + city helpers
jest.mock("../../../Redux/Reducers/CategoriesReducer", () => ({
  getCategoriesLocale: jest.fn(() => Promise.resolve([])),
}));
jest.mock("../../../Redux/Actions/CategoriesActions", () => ({
  setSelectedCategories: jest.fn((cats) => ({
    type: "SET_SELECTED_CATEGORIES",
    payload: cats,
  })),
  setCategories: jest.fn((cats) => ({ type: "SET_CATEGORIES", payload: cats })),
}));
jest.mock("../../../utils/cityManagement", () => ({
  ensureCityExists: jest.fn(() => Promise.resolve()),
}));

// Mock utils
jest.mock("../../../utils", () => ({
  AppColors: {
    primary: "#4A2258",
    white: "#FFFFFF",
    black: "#000000",
    grey_200: "#CCCCCC",
    grey_300: "#AAAAAA",
    white_100: "#F7F7F7",
    red_100_full: "#FF0000",
  },
}));
jest.mock("../../../utils/dimension", () => ({
  width: jest.fn((percent) => (percent / 100) * 375),
  height: jest.fn((percent) => (percent / 100) * 812),
}));

// Mock heavy children
jest.mock("../MapPickerModal", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "map-picker-modal" });
});
jest.mock("../../opening-hours-picker", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "opening-hours-picker" });
});
jest.mock("../../image-editor", () => {
  const React = require("react");
  const { View, TouchableOpacity, Text } = require("react-native");
  return ({ imageUri, onDone, onCancel }) =>
    React.createElement(
      View,
      { testID: "image-editor" },
      React.createElement(Text, null, imageUri),
      React.createElement(
        TouchableOpacity,
        { testID: "editor-done", onPress: () => onDone("file:///edited.jpg") },
        React.createElement(Text, null, "Done"),
      ),
      React.createElement(
        TouchableOpacity,
        { testID: "editor-cancel", onPress: onCancel },
        React.createElement(Text, null, "Cancel"),
      ),
    );
});

import * as ImagePicker from "expo-image-picker";
import { StoreForm } from "../StoreForm";

jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockT = (key) => key;

// A Mapbox geocoding response for the city lookup
const cityResponse = {
  features: [
    {
      id: "place.1",
      text: "Nice",
      place_name: "Nice, Alpes-Maritimes, France",
      center: [7.2661, 43.7102],
      context: [{ id: "postcode.9", text: "06000" }],
    },
  ],
};

describe("StoreForm", () => {
  const originalFetch = global.fetch;
  const originalConsoleError = console.error;

  // Silenced for the whole file, not per test: the city lookup rejects on a
  // microtask that can land after afterEach has already restored the spy.
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedCategories = [];
    // Typing into the city field triggers a real lookup, so give every test a
    // harmless default; individual tests override it with mock*ValueOnce.
    // `ok` matters: the street lookup goes through fetchWithRetry, which
    // checks it before reading the body.
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      }),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // render() must stay outside act(): RNTL mounts a throwaway renderer to
  // detect host component names and act() tears it down too early.
  const renderForm = async (props = {}) => {
    const utils = render(
      <StoreForm t={mockT} onSubmit={jest.fn()} mode="wizard" {...props} />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    return utils;
  };

  const placeholdersInOrder = (utils) =>
    utils
      .UNSAFE_getAllByType(TextInput)
      .map((node) => node.props.placeholder)
      .filter(Boolean);

  describe("Image editing", () => {
    it("should not render the image editor until an image is picked", async () => {
      const { queryByTestId } = await renderForm();

      expect(queryByTestId("image-editor")).toBeNull();
    });

    it("should open the image editor after picking an image", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId } = await renderForm();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      await waitFor(() => {
        expect(getByTestId("image-editor")).toBeTruthy();
      });
    });

    it("should close the editor and keep the edited image on done", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId, queryByTestId } = await renderForm();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });
      await act(async () => {
        fireEvent.press(getByTestId("editor-done"));
      });

      expect(queryByTestId("image-editor")).toBeNull();
    });

    it("should close the editor without keeping the image on cancel", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId, queryByTestId } = await renderForm();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });
      await act(async () => {
        fireEvent.press(getByTestId("editor-cancel"));
      });

      expect(queryByTestId("image-editor")).toBeNull();
    });

    it("should not open the editor when the picker is cancelled", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
      });

      const { getByText, queryByTestId } = await renderForm();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      expect(queryByTestId("image-editor")).toBeNull();
    });
  });

  describe("Field order", () => {
    it("should render the address fields in the agreed order", async () => {
      const utils = await renderForm();

      const order = placeholdersInOrder(utils);
      const addressFields = order.filter((p) =>
        [
          "store_name",
          "city",
          "postal_code",
          "street_number",
          "street",
        ].includes(p),
      );

      expect(addressFields).toEqual([
        "store_name",
        "city",
        "postal_code",
        "street_number",
        "street",
      ]);
    });

    it("should render the merchant fields in the agreed order", async () => {
      const utils = await renderForm({ showMerchantFields: true });

      const order = placeholdersInOrder(utils);
      const merchantFields = order.filter((p) =>
        [
          "manager_first_name",
          "manager_last_name",
          "store_email",
          "phone",
          "website",
        ].includes(p),
      );

      expect(merchantFields).toEqual([
        "manager_first_name",
        "manager_last_name",
        "store_email",
        "phone",
        "website",
      ]);
    });

    it("should place description before the merchant block", async () => {
      const utils = await renderForm({ showMerchantFields: true });

      const order = placeholdersInOrder(utils);

      expect(order.indexOf("description")).toBeLessThan(
        order.indexOf("manager_first_name"),
      );
    });
  });

  describe("Merchant fields visibility", () => {
    it("should show merchant fields by default", async () => {
      // StoreForm defaults showMerchantFields to true even though the hook
      // defaults it to false; this pins the rendered behaviour.
      const { getByPlaceholderText } = await renderForm();

      expect(getByPlaceholderText("manager_first_name")).toBeTruthy();
      expect(getByPlaceholderText("phone")).toBeTruthy();
    });

    it("should hide merchant fields when disabled", async () => {
      const { queryByPlaceholderText } = await renderForm({
        showMerchantFields: false,
      });

      expect(queryByPlaceholderText("manager_first_name")).toBeNull();
      expect(queryByPlaceholderText("store_email")).toBeNull();
      expect(queryByPlaceholderText("website")).toBeNull();
    });
  });

  describe("Merchant field validation", () => {
    const fillBaseFields = (utils) => {
      fireEvent.changeText(utils.getByPlaceholderText("store_name"), "Shop");
      fireEvent.changeText(utils.getByPlaceholderText("city"), "Nice");
      fireEvent.changeText(utils.getByPlaceholderText("postal_code"), "06000");
      fireEvent.changeText(utils.getByPlaceholderText("street"), "Rue de Test");
      fireEvent.changeText(
        utils.getByPlaceholderText("description"),
        "Nice shop",
      );
    };

    const fillMerchantFields = (utils) => {
      fireEvent.changeText(
        utils.getByPlaceholderText("manager_first_name"),
        "Ada",
      );
      fireEvent.changeText(
        utils.getByPlaceholderText("manager_last_name"),
        "Lovelace",
      );
      fireEvent.changeText(
        utils.getByPlaceholderText("store_email"),
        "shop@example.com",
      );
      fireEvent.changeText(utils.getByPlaceholderText("phone"), "0600000000");
    };

    it("should block submit when merchant contact fields are empty", async () => {
      mockSelectedCategories = ["cat1"];
      const onSubmit = jest.fn();
      const utils = await renderForm({ onSubmit });

      fillBaseFields(utils);

      await act(async () => {
        fireEvent.press(utils.getByText("add_store"));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "error",
        "required_fields_error",
      );
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should allow submit once merchant contact fields are filled", async () => {
      mockSelectedCategories = ["cat1"];
      const onSubmit = jest.fn();
      const utils = await renderForm({ onSubmit });

      fillBaseFields(utils);
      fillMerchantFields(utils);

      await act(async () => {
        fireEvent.press(utils.getByText("add_store"));
      });

      expect(Alert.alert).not.toHaveBeenCalled();
      expect(onSubmit).toHaveBeenCalled();
    });

    it("should not require website or street number", async () => {
      mockSelectedCategories = ["cat1"];
      const onSubmit = jest.fn();
      const utils = await renderForm({ onSubmit });

      fillBaseFields(utils);
      fillMerchantFields(utils);
      // website and street_number deliberately left blank

      await act(async () => {
        fireEvent.press(utils.getByText("add_store"));
      });

      expect(onSubmit).toHaveBeenCalled();
    });

    it("should not require merchant fields when they are hidden", async () => {
      mockSelectedCategories = ["cat1"];
      const onSubmit = jest.fn();
      const utils = await renderForm({ onSubmit, showMerchantFields: false });

      fillBaseFields(utils);

      await act(async () => {
        fireEvent.press(utils.getByText("add_store"));
      });

      expect(onSubmit).toHaveBeenCalled();
    });

    it("should block submit when no category is selected", async () => {
      mockSelectedCategories = [];
      const onSubmit = jest.fn();
      const utils = await renderForm({ onSubmit });

      fillBaseFields(utils);
      fillMerchantFields(utils);

      await act(async () => {
        fireEvent.press(utils.getByText("add_store"));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "error",
        "required_fields_error",
      );
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("City autocomplete", () => {
    it("should not search for queries shorter than two characters", async () => {
      const { getByPlaceholderText } = await renderForm();

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("city"), "N");
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should show suggestions by their full place name", async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(cityResponse),
      });

      const { getByPlaceholderText, getByText } = await renderForm();

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("city"), "Nice");
      });

      await waitFor(() => {
        expect(getByText("Nice, Alpes-Maritimes, France")).toBeTruthy();
      });
    });

    it("should query mapbox for places within the supported countries", async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(cityResponse),
      });

      const { getByPlaceholderText } = await renderForm();

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("city"), "Nice");
      });

      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain("types=place,locality");
      expect(url).toContain("country=fr,be,ch,lu,mc");
    });

    it("should fill the city with the short name and auto-fill the postal code", async () => {
      // Rows display place_name but selecting stores the short `text` value.
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(cityResponse),
      });

      const { getByPlaceholderText, getByText, queryByText } =
        await renderForm();

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("city"), "Nice");
      });

      await waitFor(() => {
        expect(getByText("Nice, Alpes-Maritimes, France")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText("Nice, Alpes-Maritimes, France"));
      });

      expect(getByPlaceholderText("city").props.value).toBe("Nice");
      expect(getByPlaceholderText("postal_code").props.value).toBe("06000");
      expect(queryByText("Nice, Alpes-Maritimes, France")).toBeNull();
    });

    it("should keep the field usable when the lookup fails", async () => {
      global.fetch.mockRejectedValueOnce(new Error("network down"));

      const { getByPlaceholderText, queryByText } = await renderForm();

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("city"), "Nice");
      });

      expect(getByPlaceholderText("city").props.value).toBe("Nice");
      expect(queryByText("Nice, Alpes-Maritimes, France")).toBeNull();
    });

    it("should tolerate a response with no features", async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({}),
      });

      const { getByPlaceholderText } = await renderForm();

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("city"), "Nice");
      });

      expect(getByPlaceholderText("city").props.value).toBe("Nice");
    });
  });
});
