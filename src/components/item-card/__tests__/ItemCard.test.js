/**
 * ItemCard Tests
 *
 * Tests the store-owner action buttons: the quick "Add Post" button sits
 * beside Edit and both are visible only to the account that owns the store.
 *
 * Run with: npx jest src/components/item-card/__tests__/ItemCard.test.js
 */

import React from "react";
import { render, act, fireEvent, waitFor } from "@testing-library/react-native";

// Mock navigation
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Mock Redux - the card reads the signed-in user to decide ownership
const mockDispatch = jest.fn();
let mockUserData = null;
jest.mock("react-redux", () => ({
  useSelector: jest.fn((selector) =>
    selector({
      user: { userData: mockUserData, favoriteStores: [] },
      categories: { categories: [], selectedCategories: [] },
    }),
  ),
  useDispatch: () => mockDispatch,
}));

// Mock Firebase
jest.mock("../../../../firebaseconfig", () => ({ firestore: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(() => ({ empty: true })),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ forEach: jest.fn() })),
}));

// Mock PostService - its mount fetch flips hasImages and moves the buttons
// between two render branches, so pin it to the no-image branch.
jest.mock("../../../services/PostService", () => ({
  __esModule: true,
  default: { getPostsForDisplay: jest.fn(() => Promise.resolve([])) },
}));

// Mock heavy children
jest.mock("../ItemDetailModal", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "item-detail-modal" });
});
jest.mock("../../city-filter", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "city-filter" });
});
jest.mock("../../text", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ children }) => React.createElement(Text, null, children);
});

// Mock utils
jest.mock("../../../utils", () => ({
  AppColors: {
    primary: "#4A2258",
    white: "#FFFFFF",
    grey_200: "#CCCCCC",
    grey_300: "#AAAAAA",
    black: "#000000",
    white_100: "#F7F7F7",
  },
}));
jest.mock("../../../utils/dimension", () => ({
  width: jest.fn((percent) => (percent / 100) * 375),
  height: jest.fn((percent) => (percent / 100) * 812),
}));
jest.mock("../../../utils/useTranslation", () => ({
  useTranslation: () => ({ t: (key) => key, locale: "en" }),
}));
jest.mock("../../../Redux/Actions/CategoriesActions", () => ({
  setSelectedCategories: jest.fn((cats) => ({
    type: "SET_SELECTED_CATEGORIES",
    payload: cats,
  })),
}));

// Mock icons - the owner buttons are icon-only, so these testIDs are the
// only way to target them. Factories are hoisted above the file body, so
// each one has to build its own element inline.
jest.mock("../../../../assets/icons/add-circle-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "add-circle-icon" });
});
jest.mock("../../../../assets/icons/edit-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "edit-icon" });
});
jest.mock("../../../../assets/icons/pin-filled", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "pin-filled" });
});
jest.mock("../../../../assets/icons/info-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "info-icon" });
});
jest.mock("../../../../assets/icons/heart-filled", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "heart-filled" });
});
jest.mock("../../../../assets/icons/heart-unfilled", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "heart-unfilled" });
});
jest.mock("../../../../assets/icons/checkmark-circle-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "checkmark-circle-icon" });
});
jest.mock("../../../../assets/icons/clock-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "clock-icon" });
});
jest.mock("../../../../assets/icons/star-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "star-icon" });
});

import ItemCard from "../ItemCard";
import { ScreenNames } from "../../../Routes/routes";

const OWNER_ID = "owner-uid";

describe("ItemCard - store owner actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserData = null;
  });

  const renderCard = (props = {}) =>
    render(
      <ItemCard
        title="Test Store"
        tags={[]}
        description="A store"
        address={[]}
        id={1}
        isFavorite={false}
        onPressFavorite={jest.fn()}
        owner_id={OWNER_ID}
        onPress={jest.fn()}
        openingHours={{}}
        is_validated={true}
        {...props}
      />,
    );

  // render() must not be wrapped in act(): RNTL mounts a throwaway renderer to
  // detect host component names, and act() tears it down before it can read it.
  const renderSettled = async (props = {}) => {
    const utils = renderCard(props);
    await act(async () => {
      await Promise.resolve();
    });
    return utils;
  };

  describe("Visibility", () => {
    it("should show add post and edit buttons to the store owner", async () => {
      mockUserData = { id: OWNER_ID, userType: "owner" };

      const { getByTestId } = await renderSettled();

      await waitFor(() => {
        expect(getByTestId("add-circle-icon")).toBeTruthy();
      });
      expect(getByTestId("edit-icon")).toBeTruthy();
    });

    it("should hide both buttons from a shopper", async () => {
      mockUserData = { id: "shopper-uid", userType: "user" };

      const { queryByTestId } = await renderSettled();

      expect(queryByTestId("add-circle-icon")).toBeNull();
      expect(queryByTestId("edit-icon")).toBeNull();
    });

    it("should hide both buttons from an owner who does not own this store", async () => {
      // Ownership is the permission, not account type.
      mockUserData = { id: "other-owner-uid", userType: "owner" };

      const { queryByTestId } = await renderSettled();

      expect(queryByTestId("add-circle-icon")).toBeNull();
      expect(queryByTestId("edit-icon")).toBeNull();
    });

    it("should hide both buttons from a signed-out visitor", async () => {
      mockUserData = null;

      const { queryByTestId } = await renderSettled();

      expect(queryByTestId("add-circle-icon")).toBeNull();
      expect(queryByTestId("edit-icon")).toBeNull();
    });

    it("should hide both buttons when the store has no owner", async () => {
      // Bulk-imported stores carry a null owner_id.
      mockUserData = { id: OWNER_ID, userType: "owner" };

      const { queryByTestId } = await renderSettled({ owner_id: null });

      expect(queryByTestId("add-circle-icon")).toBeNull();
      expect(queryByTestId("edit-icon")).toBeNull();
    });

    it("should not match a numeric id against a string owner_id", async () => {
      // ownsStore compares with ===, so a type mismatch silently denies.
      mockUserData = { id: 42, userType: "owner" };

      const { queryByTestId } = await renderSettled({ owner_id: "42" });

      expect(queryByTestId("add-circle-icon")).toBeNull();
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      mockUserData = { id: OWNER_ID, userType: "owner" };
    });

    it("should navigate to manage posts with the store owner id", async () => {
      const { getByTestId } = await renderSettled({
        id: 7,
        title: "Corner Shop",
      });

      await act(async () => {
        fireEvent.press(getByTestId("add-circle-icon"));
      });

      expect(mockNavigate).toHaveBeenCalledWith(ScreenNames.MANAGE_POSTS, {
        storeId: 7,
        storeName: "Corner Shop",
        ownerId: OWNER_ID,
      });
    });

    it("should navigate to handle store from the edit button", async () => {
      const { getByTestId } = await renderSettled({ id: 7 });

      await act(async () => {
        fireEvent.press(getByTestId("edit-icon"));
      });

      expect(mockNavigate).toHaveBeenCalledWith(ScreenNames.HANDLE_STORE, {
        storeId: 7,
      });
    });
  });
});
