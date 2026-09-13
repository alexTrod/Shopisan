/**
 * HandleStore (edit store) save-flow tests
 *
 * Covers the WP6 fixes:
 * - validation failure names the missing fields and scrolls to the first one
 * - geocoding runs before any image upload (a bad address uploads nothing)
 * - an upload failure aborts the whole save with a translated message
 * - a successful save keeps the store's country, persists uploaded images
 *   and clears them from the pending list so a retry does not re-upload
 *
 * Run with: npx jest src/screens/app/handle_store/__tests__/HandleStore.update.test.js
 */

import React from "react";
import { Alert, DeviceEventEmitter, ScrollView } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { buildStoreAddress } from "../../../../utils/storeAddress";

const mockDispatch = jest.fn();
const mockUser = { id: "owner-uid", userType: "owner" };
jest.mock("react-redux", () => ({
  useSelector: jest.fn((selector) =>
    selector({
      user: { userData: mockUser },
      categories: { categories: [{ id: "cat1", name: "Bakery" }] },
    }),
  ),
  useDispatch: () => mockDispatch,
}));

jest.mock("../../../../../firebaseconfig", () => ({ firestore: {} }));

const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn(() => Promise.resolve());
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  doc: jest.fn(() => ({ path: "stores/doc-1" })),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: jest.fn(),
}));

const mockEnsureCityExists = jest.fn(() => Promise.resolve({ success: true }));
jest.mock("../../../../utils/cityManagement", () => ({
  ensureCityExists: (...args) => mockEnsureCityExists(...args),
}));

jest.mock("../../../../Redux/Reducers/CategoriesReducer", () => ({
  getCategoriesLocale: jest.fn(() => Promise.resolve([])),
}));
jest.mock("../../../../Redux/Actions/CategoriesActions", () => ({
  setCategories: jest.fn((cats) => ({ type: "SET_CATEGORIES", payload: cats })),
}));

jest.mock("../../../../services/LocationManager", () => ({
  __esModule: true,
  default: { getUserLocation: jest.fn() },
}));

const mockLaunchImageLibrary = jest.fn();
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args) => mockLaunchImageLibrary(...args),
}));

jest.mock("../../../../utils/useTranslation", () => ({
  useTranslation: () => ({ t: (key) => key, locale: "en" }),
}));

jest.mock("../../../../utils", () => ({
  AppColors: {
    primary: "#4A2258",
    primary_faded: "#EEE6F2",
    white: "#FFFFFF",
    white_100: "#F7F7F7",
    grey_200: "#CCCCCC",
    grey_300: "#AAAAAA",
    black: "#000000",
    red: "#FF0000",
  },
}));
jest.mock("../../../../utils/dimension", () => ({
  width: jest.fn((p) => (p / 100) * 375),
  height: jest.fn((p) => (p / 100) * 812),
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return {
    Ionicons: ({ name }) =>
      React.createElement("View", { testID: `icon-${name}` }),
  };
});

// Heavy children
jest.mock("../../../../components/store-form/MapPickerModal", () => {
  const React = require("react");
  return ({ visible }) =>
    visible ? React.createElement("View", { testID: "map-picker-modal" }) : null;
});
jest.mock("../../../../components/opening-hours-picker", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "opening-hours-picker" });
});
jest.mock("../../../../components/image-editor", () => {
  const React = require("react");
  const { TouchableOpacity, Text } = require("react-native");
  return ({ imageUri, onDone }) =>
    React.createElement(
      TouchableOpacity,
      { testID: "image-editor-done", onPress: () => onDone(imageUri) },
      React.createElement(Text, null, "done"),
    );
});

// Icons
const iconMock = (testID) => () => {
  const React = require("react");
  return React.createElement("View", { testID });
};
jest.mock("../../../../../assets/icons/chevron-left", () =>
  iconMock("chevron-left"),
);
jest.mock("../../../../../assets/icons/location-icon", () =>
  iconMock("location-icon"),
);
jest.mock("../../../../../assets/icons/close-icon", () =>
  iconMock("close-icon"),
);
jest.mock("../../../../../assets/icons/close-circle-icon", () =>
  iconMock("close-circle-icon"),
);
jest.mock("../../../../../assets/icons/camera-icon", () =>
  iconMock("camera-icon"),
);
jest.mock("../../../../../assets/icons/star-icon", () => iconMock("star-icon"));
jest.mock("../../../../../assets/icons/add-post-icon", () =>
  iconMock("add-post-icon"),
);

import HandleStoreScreen from "../index";

const GEOCODE_HOST = "maps.googleapis.com";
const CLOUDFLARE_HOST = "api.cloudflare.com";

const makeStore = (overrides = {}) => ({
  id: "store-1",
  owner_id: "owner-uid",
  name: "Boulangerie Test",
  description: { fr: "Du bon pain" },
  category: ["cat1"],
  cityName: "Bruxelles",
  address: buildStoreAddress({
    street: "Rue Neuve",
    streetNumber: "12",
    city: "Bruxelles",
    postalCode: "1000",
    countryId: "BE",
    latitude: 50.85,
    longitude: 4.35,
  }),
  latitude: 50.85,
  longitude: 4.35,
  email: "shop@example.com",
  phone: "0470000000",
  managerFirstName: "Ann",
  managerLastName: "Peeters",
  website: "",
  images: ["https://img.example/existing.jpg"],
  openingHours: {},
  ...overrides,
});

const jsonResponse = (body) => Promise.resolve({ json: () => body });

const geocodeOk = () =>
  jsonResponse({
    status: "OK",
    results: [{ geometry: { location: { lat: 50.851, lng: 4.351 } } }],
  });

// Route fetch calls by host so a test can script geocode vs upload responses.
const installFetch = ({ geocode, upload }) => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes(GEOCODE_HOST)) return geocode(url);
    if (String(url).includes(CLOUDFLARE_HOST)) return upload(url);
    return jsonResponse({});
  });
  return global.fetch;
};

const fetchCallsTo = (host) =>
  global.fetch.mock.calls.filter(([url]) => String(url).includes(host));

const renderScreen = (store = makeStore()) => {
  mockGetDocs.mockResolvedValue({
    empty: false,
    docs: [{ id: "doc-1", data: () => store }],
  });
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const utils = render(
    <HandleStoreScreen
      route={{ params: { storeId: "store-1" } }}
      navigation={navigation}
    />,
  );
  return { ...utils, navigation };
};

// Pick a photo through the mocked picker + editor so it lands in selectedImages.
const addPhoto = async (utils, uri = "file:///tmp/new.jpg") => {
  mockLaunchImageLibrary.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri }],
  });
  await act(async () => {
    fireEvent.press(utils.getByText("add_image"));
  });
  await act(async () => {
    fireEvent.press(await utils.findByTestId("image-editor-done"));
  });
};

const submit = async (utils) => {
  await act(async () => {
    fireEvent.press(utils.getByTestId("update-store-submit-button"));
  });
};

describe("HandleStoreScreen - update flow", () => {
  let alertSpy;
  let emitSpy;
  let scrollToSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    emitSpy = jest.spyOn(DeviceEventEmitter, "emit");
    scrollToSpy = jest
      .spyOn(ScrollView.prototype, "scrollTo")
      .mockImplementation(() => {});
    installFetch({ geocode: geocodeOk, upload: () => jsonResponse({}) });
  });

  afterEach(() => {
    alertSpy.mockRestore();
    emitSpy.mockRestore();
    scrollToSpy.mockRestore();
  });

  it("names the missing fields and scrolls to the first one", async () => {
    const utils = renderScreen();
    await utils.findByDisplayValue("Boulangerie Test");

    // Blank two required fields. Render order is name, street, city,
    // postalCode, description, so city is the first errored field.
    fireEvent.changeText(utils.getByPlaceholderText("city"), "");
    fireEvent.changeText(utils.getByPlaceholderText("description"), "   ");

    // Simulate layout so the scroll target is known.
    fireEvent(utils.getByText("city"), "layout", {
      nativeEvent: { layout: { y: 320 } },
    });
    fireEvent(utils.getByText("description"), "layout", {
      nativeEvent: { layout: { y: 540 } },
    });

    await submit(utils);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message] = alertSpy.mock.calls[0];
    expect(title).toBe("error");
    expect(message).toContain("required_fields_error");
    expect(message).toContain("city");
    expect(message).toContain("description");
    expect(message).not.toContain("store_name");

    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({ y: 320 - 12, animated: true }),
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it("geocodes before uploading: a bad address uploads nothing", async () => {
    installFetch({
      geocode: () => jsonResponse({ status: "ZERO_RESULTS", results: [] }),
      upload: () => jsonResponse({ success: true }),
    });
    const utils = renderScreen();
    await utils.findByDisplayValue("Boulangerie Test");
    await addPhoto(utils);

    await submit(utils);

    expect(fetchCallsTo(GEOCODE_HOST)).toHaveLength(1);
    expect(fetchCallsTo(CLOUDFLARE_HOST)).toHaveLength(0);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("error", "address_not_found");
    expect(utils.navigation.goBack).not.toHaveBeenCalled();
  });

  it("aborts the save with a translated message when an upload fails", async () => {
    installFetch({
      geocode: geocodeOk,
      upload: () => jsonResponse({ success: false, errors: [{}] }),
    });
    const utils = renderScreen();
    await utils.findByDisplayValue("Boulangerie Test");
    await addPhoto(utils);

    await submit(utils);

    expect(fetchCallsTo(CLOUDFLARE_HOST)).toHaveLength(1);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("error", "image_upload_failed");
    expect(emitSpy).not.toHaveBeenCalledWith("stores:refresh");
  });

  it("reports an upload timeout with its own message", async () => {
    installFetch({
      geocode: geocodeOk,
      upload: () => Promise.reject(Object.assign(new Error("x"), { name: "AbortError" })),
    });
    const utils = renderScreen();
    await utils.findByDisplayValue("Boulangerie Test");
    await addPhoto(utils);

    await submit(utils);

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("error", "image_upload_timeout");
  });

  it("saves with the store's country, persists images and does not re-upload on retry", async () => {
    const fetchMock = installFetch({
      geocode: geocodeOk,
      upload: () =>
        jsonResponse({
          success: true,
          result: { variants: ["https://img.example/uploaded.jpg"] },
        }),
    });
    const utils = renderScreen();
    await utils.findByDisplayValue("Boulangerie Test");
    await addPhoto(utils);

    await submit(utils);

    // Geocode carries the store's own country (BE), not a hardcoded FR.
    const [geocodeUrl] = fetchCallsTo(GEOCODE_HOST)[0];
    expect(decodeURIComponent(geocodeUrl)).toContain("1000 Bruxelles, BE");
    expect(geocodeUrl).toContain("&region=be");

    expect(fetchCallsTo(CLOUDFLARE_HOST)).toHaveLength(1);

    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledTimes(1));
    const [, written] = mockUpdateDoc.mock.calls[0];
    expect(written.images).toEqual([
      "https://img.example/existing.jpg",
      "https://img.example/uploaded.jpg",
    ]);
    expect(written.imageUrl).toBe("https://img.example/existing.jpg");
    expect(written.latitude).toBe(50.851);
    expect(written.address[0].location.city.country_id).toBe("BE");
    expect(written.owner_id).toBe("owner-uid");

    expect(mockEnsureCityExists).toHaveBeenCalledWith(
      "Bruxelles",
      "1000",
      50.851,
      4.351,
      "BE",
    );
    expect(emitSpy).toHaveBeenCalledWith("stores:refresh");
    expect(alertSpy).toHaveBeenCalledWith("success", "store_updated_success");
    expect(utils.navigation.goBack).toHaveBeenCalledTimes(1);

    // Retry: the uploaded picture is now an existing URL, so no new upload.
    fetchMock.mockClear();
    await submit(utils);
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledTimes(2));
    expect(fetchCallsTo(CLOUDFLARE_HOST)).toHaveLength(0);
    expect(mockUpdateDoc.mock.calls[1][1].images).toEqual([
      "https://img.example/existing.jpg",
      "https://img.example/uploaded.jpg",
    ]);
  });

  it("opens the map picker from the pick-on-map link", async () => {
    const utils = renderScreen();
    await utils.findByDisplayValue("Boulangerie Test");
    expect(utils.queryByTestId("map-picker-modal")).toBeNull();

    fireEvent.press(utils.getByText("pick_on_map"));

    expect(utils.getByTestId("map-picker-modal")).toBeTruthy();
  });
});
