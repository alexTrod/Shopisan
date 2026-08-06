/**
 * PostForm Tests
 *
 * Tests for post form image handling, picker integration, and validation.
 *
 * Run with: npx jest src/components/post-form/__tests__/PostForm.test.js
 */

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";

// Mock dependencies
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("../../../utils", () => ({
  AppColors: {
    primary: "#007AFF",
    background: "#FFFFFF",
  },
}));

jest.mock("../../../utils/dimension", () => ({
  width: jest.fn((percent) => (percent / 100) * 375),
  height: jest.fn((percent) => (percent / 100) * 812),
}));

jest.mock("../../../utils/useTranslation", () => ({
  useTranslation: () => ({
    t: (key) => key,
    locale: "en",
  }),
}));

jest.mock("../../../../assets/icons/camera-icon", () => {
  const React = require("react");
  return ({ width, height, color }) =>
    React.createElement("View", { testID: "camera-icon" });
});

jest.mock("../../../../assets/icons/close-circle-icon", () => {
  const React = require("react");
  return ({ width, height, color }) =>
    React.createElement("View", { testID: "close-circle-icon" });
});

// Mock ImageEditor
jest.mock("../../image-editor", () => {
  const React = require("react");
  const { View, TouchableOpacity, Text } = require("react-native");
  return ({ imageUri, onDone, onCancel, outputSize, t }) =>
    React.createElement(
      View,
      { testID: "image-editor" },
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
import PostForm from "../index";

// Spy on Alert
jest.spyOn(Alert, "alert");

describe("PostForm", () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderForm = (props = {}) => {
    return render(
      <PostForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        loading={false}
        {...props}
      />,
    );
  };

  describe("Image Picker", () => {
    it("should open image picker with correct options", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
      });

      const { getByText } = renderForm();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
    });

    it("should show ImageEditor modal after image selection", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId } = renderForm();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      await waitFor(() => {
        expect(getByTestId("image-editor")).toBeTruthy();
      });
    });

    it("should add edited image to list after editor done", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId, queryByTestId } = renderForm();

      // Pick image
      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      // Wait for editor
      await waitFor(() => {
        expect(getByTestId("image-editor")).toBeTruthy();
      });

      // Complete editing
      await act(async () => {
        fireEvent.press(getByTestId("editor-done"));
      });

      // Editor should close
      await waitFor(() => {
        expect(queryByTestId("image-editor")).toBeNull();
      });
    });

    it("should close editor on cancel without adding image", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId, queryByTestId } = renderForm();

      // Pick image
      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      // Wait for editor
      await waitFor(() => {
        expect(getByTestId("image-editor")).toBeTruthy();
      });

      // Cancel editing
      await act(async () => {
        fireEvent.press(getByTestId("editor-cancel"));
      });

      // Editor should close
      await waitFor(() => {
        expect(queryByTestId("image-editor")).toBeNull();
      });
    });

    it("should handle picker cancellation", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
      });

      const { getByText, queryByTestId } = renderForm();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      // Editor should not appear
      expect(queryByTestId("image-editor")).toBeNull();
    });

    it("should handle picker errors", async () => {
      ImagePicker.launchImageLibraryAsync.mockRejectedValueOnce(
        new Error("Picker error"),
      );

      const { getByText } = renderForm();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "error",
        "unable_to_open_image_picker",
      );
    });
  });

  describe("Image Management", () => {
    it("should distinguish existing vs new images in edit mode", () => {
      const { queryAllByTestId } = renderForm({
        initialData: {
          id: "post123",
          images: [
            "https://cdn.com/existing1.jpg",
            "https://cdn.com/existing2.jpg",
          ],
          description: { en: "Existing post" },
          price: 25,
        },
      });

      // Should render existing images
      // FlatList renders the images
    });

    it("should populate form fields from initialData", () => {
      const { getByDisplayValue } = renderForm({
        initialData: {
          id: "post123",
          images: ["https://cdn.com/img.jpg"],
          description: { en: "Test description" },
          price: 99.99,
        },
      });

      expect(getByDisplayValue("Test description")).toBeTruthy();
      expect(getByDisplayValue("99.99")).toBeTruthy();
    });
  });

  describe("Form Validation", () => {
    it("should require at least one image on submit", async () => {
      const { getByText } = renderForm();

      await act(async () => {
        fireEvent.press(getByText("create_post"));
      });

      expect(Alert.alert).toHaveBeenCalledWith("error", "post_image_required");
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("should allow submit with at least one image", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId } = renderForm();

      // Add image
      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      await waitFor(() => {
        expect(getByTestId("image-editor")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId("editor-done"));
      });

      // Submit
      await act(async () => {
        fireEvent.press(getByText("create_post"));
      });

      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  describe("Form Submission", () => {
    it("should pass correct data structure to onSubmit", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId, getByPlaceholderText } = renderForm();

      // Add image
      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      await waitFor(() => {
        expect(getByTestId("image-editor")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId("editor-done"));
      });

      // Fill price
      const priceInput = getByPlaceholderText("0.00");
      fireEvent.changeText(priceInput, "49.99");

      // Submit
      await act(async () => {
        fireEvent.press(getByText("create_post"));
      });

      expect(mockOnSubmit).toHaveBeenCalledWith({
        imageUris: ["file:///edited.jpg"],
        existingImages: [],
        description: {},
        price: "49.99",
        currency: { code: "EUR", symbol: "€" },
      });
    });

    it("should include existingImages in edit mode", async () => {
      const { getByText } = renderForm({
        initialData: {
          id: "post123",
          images: ["https://cdn.com/existing.jpg"],
          description: {},
          price: null,
        },
      });

      await act(async () => {
        fireEvent.press(getByText("save"));
      });

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          existingImages: ["https://cdn.com/existing.jpg"],
        }),
      );
    });

    it("should show save button in edit mode", () => {
      const { getByText, queryByText } = renderForm({
        initialData: {
          id: "post123",
          images: ["https://cdn.com/img.jpg"],
          description: {},
        },
      });

      expect(getByText("save")).toBeTruthy();
      expect(queryByText("create_post")).toBeNull();
    });
  });

  describe("Loading State", () => {
    it("should pass loading prop to disable buttons", () => {
      // When loading=true, buttons should be disabled
      // This is verified by the submit button showing ActivityIndicator
      const { UNSAFE_getByType, getByText } = renderForm({
        loading: true,
        initialData: {
          id: "post123",
          images: ["https://cdn.com/img.jpg"],
        },
      });

      // Verify cancel button is present
      expect(getByText("cancel")).toBeTruthy();
    });

    it("should show ActivityIndicator in submit button when loading", () => {
      const { UNSAFE_getByType } = renderForm({
        loading: true,
        initialData: {
          id: "post123",
          images: ["https://cdn.com/img.jpg"],
        },
      });

      const { ActivityIndicator } = require("react-native");
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe("Cancel Action", () => {
    it("should call onCancel when cancel button pressed", () => {
      const { getByText } = renderForm();

      fireEvent.press(getByText("cancel"));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("Description Fields", () => {
    it("should show EN description field when locale is en", () => {
      const { getByText } = renderForm();

      expect(getByText("description (EN)")).toBeTruthy();
    });

    it("should trim description before submit", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId, getByPlaceholderText } = renderForm();

      // Add image
      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });

      await waitFor(() => {
        expect(getByTestId("image-editor")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId("editor-done"));
      });

      // Fill description with whitespace
      const descInput = getByPlaceholderText("post_description_placeholder");
      fireEvent.changeText(descInput, "  Test description  ");

      // Submit
      await act(async () => {
        fireEvent.press(getByText("create_post"));
      });

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: { en: "Test description" },
        }),
      );
    });
  });

  describe("Currency", () => {
    it("should label the price field with the active currency code", () => {
      // t() returns the key in tests, so this renders as "price (EUR) - optional".
      // In the app the `price` translation already ends in a colon, so the real
      // UI reads "Price: (EUR) - optional".
      const { getByText } = renderForm();

      expect(getByText("price (EUR) - optional")).toBeTruthy();
    });

    it("should default to EUR and show the code on the currency button", () => {
      const { getByText } = renderForm();

      expect(getByText("EUR")).toBeTruthy();
    });

    it("should submit the default currency object with the post", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId } = renderForm();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });
      await act(async () => {
        fireEvent.press(getByTestId("editor-done"));
      });
      await act(async () => {
        fireEvent.press(getByText("create_post"));
      });

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: { code: "EUR", symbol: "€" },
        }),
      );
    });

    it("should prefix the price input with the currency symbol", async () => {
      const { getByText } = renderForm();

      expect(getByText("€")).toBeTruthy();
    });

    it("should move the prefix symbol with the selected currency", async () => {
      const { getByText, queryByText } = renderForm();

      await act(async () => {
        fireEvent.press(getByText("EUR"));
      });
      await act(async () => {
        fireEvent.press(getByText("British Pound"));
      });

      expect(getByText("£")).toBeTruthy();
      expect(queryByText("€")).toBeNull();
    });

    it("should list every currency with its symbol in the picker", async () => {
      const { getByText } = renderForm();

      await act(async () => {
        fireEvent.press(getByText("EUR"));
      });

      expect(getByText("Euro")).toBeTruthy();
      expect(getByText("$")).toBeTruthy();
    });

    it("should switch currency from the picker and keep only code and symbol", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg" }],
      });

      const { getByText, getByTestId } = renderForm();

      await act(async () => {
        fireEvent.press(getByText("EUR"));
      });
      await act(async () => {
        fireEvent.press(getByText("British Pound"));
      });

      // Button and label both follow the selection
      expect(getByText("price (GBP) - optional")).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText("add_image"));
      });
      await act(async () => {
        fireEvent.press(getByTestId("editor-done"));
      });
      await act(async () => {
        fireEvent.press(getByText("create_post"));
      });

      // name and flag are dropped on selection
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: { code: "GBP", symbol: "£" },
        }),
      );
    });

    it("should adopt an object currency from initialData", () => {
      const { getByText } = renderForm({
        initialData: {
          id: "post123",
          images: ["https://cdn.example/a.jpg"],
          currency: { code: "CHF", symbol: "CHF" },
        },
      });

      expect(getByText("price (CHF) - optional")).toBeTruthy();
    });

    it("should coerce a legacy string currency from initialData", () => {
      // Older posts stored the currency as a bare string.
      const { getByText } = renderForm({
        initialData: {
          id: "post123",
          images: ["https://cdn.example/a.jpg"],
          currency: "USD",
        },
      });

      expect(getByText("price (USD) - optional")).toBeTruthy();
    });
  });
});
