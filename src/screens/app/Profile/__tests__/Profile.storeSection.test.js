/**
 * Profile store section tests
 *
 * The Store section is the only guaranteed entry point to the store editor:
 * the pencil on the store card only shows when the store happens to be in the
 * current home list. These tests cover the "Edit my store" tile added for
 * that, plus the owner/shopper visibility split.
 *
 * Run with: npx jest src/screens/app/Profile/__tests__/Profile.storeSection.test.js
 */

import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockUserData = null;

jest.mock("react-redux", () => ({
  useSelector: jest.fn((selector) =>
    selector({ user: { userData: mockUserData } }),
  ),
  useDispatch: () => mockDispatch,
}));

jest.mock("../../../../../firebaseconfig", () => ({
  firestore: {},
  auth: { currentUser: null },
}));

const mockGetDocs = jest.fn();
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock("../../../../Redux/Actions/UserActions", () => ({
  signOut: jest.fn(() => ({ type: "SIGN_OUT" })),
  deleteAccount: jest.fn(() => ({ type: "DELETE_ACCOUNT" })),
}));
jest.mock("../../../../Redux/Slices/localeSlice", () => ({
  setLocale: jest.fn((l) => ({ type: "SET_LOCALE", payload: l })),
}));

// Lightweight stand-ins for layout components
jest.mock("../../../../components/screen-wrapper", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }) => React.createElement(View, null, children);
});
jest.mock("../../../../components/header", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "header" });
});
jest.mock("../../../../components/text", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ children }) => React.createElement(Text, null, children);
});
jest.mock("../../../../components/email-verification", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "email-banner" });
});
jest.mock("../../../../components/language-selector", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "language-selector" });
});

jest.mock("../../../../utils", () => ({
  AppColors: {
    primary: "#4A2258",
    white: "#FFFFFF",
    white_100: "#F7F7F7",
    grey_100: "#EEEEEE",
    grey_300: "#AAAAAA",
    black: "#000000",
    error: "#dc3545",
  },
}));
jest.mock("../../../../utils/dimension", () => ({
  width: jest.fn((p) => (p / 100) * 375),
  height: jest.fn((p) => (p / 100) * 812),
}));
jest.mock("../../../../utils/useTranslation", () => ({
  useTranslation: () => ({ t: (key) => key, locale: "en" }),
}));

// Icon mocks (icon-only buttons need testIDs)
jest.mock("../../../../../assets/icons/chevron-right", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "chevron-right" });
});
jest.mock("../../../../../assets/icons/close-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "close-icon" });
});
jest.mock("../../../../../assets/icons/instagram-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "instagram-icon" });
});
jest.mock("../../../../../assets/icons/globe-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "globe-icon" });
});
jest.mock("../../../../../assets/icons/logout-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "logout-icon" });
});
jest.mock("../../../../../assets/icons/trash-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "trash-icon" });
});

import Profile from "../index";
import { ScreenNames } from "../../../../Routes/routes";

const storesSnapshot = (stores) => ({
  docs: stores.map((s) => ({ data: () => s })),
});

describe("Profile - Store section", () => {
  const navigation = { navigate: mockNavigate };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserData = { id: "owner-1", userType: "owner", email: "o@x.com" };
  });

  it("shows Edit my store and Manage posts tiles for owners", () => {
    const { getByText } = render(<Profile navigation={navigation} />);
    expect(getByText("edit_my_store")).toBeTruthy();
    expect(getByText("manage_posts")).toBeTruthy();
    expect(getByText("add_a_store")).toBeTruthy();
  });

  it("hides the Store section for shoppers", () => {
    mockUserData = { id: "shopper-1", userType: "shopper", email: "s@x.com" };
    const { queryByText } = render(<Profile navigation={navigation} />);
    expect(queryByText("edit_my_store")).toBeNull();
    expect(queryByText("manage_posts")).toBeNull();
  });

  it("navigates straight to HandleStore when the owner has one store", async () => {
    mockGetDocs.mockResolvedValueOnce(
      storesSnapshot([{ id: 42, name: "Billy", owner_id: "owner-1" }]),
    );
    const { getByText } = render(<Profile navigation={navigation} />);
    fireEvent.press(getByText("edit_my_store"));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(ScreenNames.HANDLE_STORE, {
        storeId: 42,
      }),
    );
  });

  it("ignores trashed stores and alerts when nothing is editable", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockGetDocs.mockResolvedValueOnce(
      storesSnapshot([
        { id: 7, name: "Old", owner_id: "owner-1", deleted_at: { s: 1 } },
      ]),
    );
    const { getByText } = render(<Profile navigation={navigation} />);
    fireEvent.press(getByText("edit_my_store"));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "edit_my_store",
        "no_stores_to_edit",
      ),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("opens the store picker when the owner has several stores, and picking one edits it", async () => {
    mockGetDocs.mockResolvedValueOnce(
      storesSnapshot([
        { id: 1, name: "Store A", owner_id: "owner-1" },
        { id: 2, name: "Store B", owner_id: "owner-1" },
      ]),
    );
    const { getByText } = render(<Profile navigation={navigation} />);
    fireEvent.press(getByText("edit_my_store"));
    await waitFor(() => expect(getByText("Store B")).toBeTruthy());
    fireEvent.press(getByText("Store B"));
    expect(mockNavigate).toHaveBeenCalledWith(ScreenNames.HANDLE_STORE, {
      storeId: 2,
    });
  });

  it("keeps Manage posts wired to the posts flow", async () => {
    mockGetDocs.mockResolvedValueOnce(
      storesSnapshot([{ id: 42, name: "Billy", owner_id: "owner-1" }]),
    );
    const { getByText } = render(<Profile navigation={navigation} />);
    fireEvent.press(getByText("manage_posts"));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(ScreenNames.MANAGE_POSTS, {
        storeId: 42,
        storeName: "Billy",
        ownerId: "owner-1",
      }),
    );
  });
});
