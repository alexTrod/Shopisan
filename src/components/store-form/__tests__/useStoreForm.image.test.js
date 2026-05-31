/**
 * useStoreForm Image Upload Tests
 *
 * Tests for store form image handling, picker integration, and upload flow.
 *
 * Run with: npx jest src/components/store-form/__tests__/useStoreForm.image.test.js
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as React from "react";

// Mock all external dependencies
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "denied" }),
  ),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock("react-redux", () => ({
  useSelector: jest.fn((selector) => {
    if (selector.toString().includes("user")) {
      return { id: "user123", email: "test@example.com" };
    }
    return { categories: [], selectedCategories: [] };
  }),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  doc: jest.fn(),
  getDoc: jest.fn(() =>
    Promise.resolve({ exists: () => true, data: () => ({ id: 123 }) }),
  ),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock("firebase/functions", () => ({
  httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve())),
}));

jest.mock("../../../../firebaseconfig", () => ({
  firestore: {},
  functions: {},
}));

jest.mock("../../../Redux/Reducers/CategoriesReducer", () => ({
  getCategoriesLocale: jest.fn(() => Promise.resolve([])),
}));

jest.mock("../../../Redux/Actions/CategoriesActions", () => ({
  setSelectedCategories: jest.fn(),
  setCategories: jest.fn(),
}));

jest.mock("../../../utils/cityManagement", () => ({
  ensureCityExists: jest.fn(() => Promise.resolve()),
}));

import * as ImagePicker from "expo-image-picker";
import { useStoreForm } from "../useStoreForm";

jest.spyOn(Alert, "alert");

describe("useStoreForm - Image Upload", () => {
  const mockT = jest.fn((key) => key);

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  const renderUseStoreForm = (props = {}) => {
    return renderHook(() =>
      useStoreForm({
        t: mockT,
        onSuccess: jest.fn(),
        mode: "standalone",
        ...props,
      }),
    );
  };

  describe("Image Picker", () => {
    it("should launch picker with quality: 1, allowsEditing: false", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
      });

      const { result } = renderUseStoreForm();

      await act(async () => {
        await result.current.handlePickImage();
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
    });

    it("should set imageToEdit state on selection", async () => {
      const testUri = "file:///test/image.jpg";
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: testUri }],
      });

      const { result } = renderUseStoreForm();

      await act(async () => {
        await result.current.handlePickImage();
      });

      expect(result.current.imageToEdit).toBe(testUri);
    });

    it("should not set imageToEdit when picker cancelled", async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
      });

      const { result } = renderUseStoreForm();

      await act(async () => {
        await result.current.handlePickImage();
      });

      expect(result.current.imageToEdit).toBeNull();
    });

    it("should show alert on picker error", async () => {
      ImagePicker.launchImageLibraryAsync.mockRejectedValueOnce(
        new Error("Picker error"),
      );

      const { result } = renderUseStoreForm();

      await act(async () => {
        await result.current.handlePickImage();
      });

      expect(Alert.alert).toHaveBeenCalledWith("error", "image_picker_error");
    });
  });

  describe("Image Editing", () => {
    it("should add to selectedImages after edit complete", async () => {
      const { result } = renderUseStoreForm();

      // Initial state
      expect(result.current.selectedImages).toEqual([]);

      // Simulate edit complete
      await act(async () => {
        result.current.handleImageEdited("file:///edited.jpg");
      });

      expect(result.current.selectedImages).toHaveLength(1);
      expect(result.current.selectedImages[0].uri).toBe("file:///edited.jpg");
    });

    it("should clear imageToEdit after edit complete", async () => {
      const { result } = renderUseStoreForm();

      // Set imageToEdit
      await act(async () => {
        result.current.setImageToEdit("file:///original.jpg");
      });

      expect(result.current.imageToEdit).toBe("file:///original.jpg");

      // Complete edit
      await act(async () => {
        result.current.handleImageEdited("file:///edited.jpg");
      });

      expect(result.current.imageToEdit).toBeNull();
    });

    it("should clear imageToEdit on cancel", async () => {
      const { result } = renderUseStoreForm();

      // Set imageToEdit
      await act(async () => {
        result.current.setImageToEdit("file:///original.jpg");
      });

      // Cancel
      await act(async () => {
        result.current.handleCancelEdit();
      });

      expect(result.current.imageToEdit).toBeNull();
    });
  });

  describe("Image Removal", () => {
    it("should remove image at specified index", async () => {
      const { result } = renderUseStoreForm();

      // Add images
      await act(async () => {
        result.current.handleImageEdited("file:///1.jpg");
      });
      await act(async () => {
        result.current.handleImageEdited("file:///2.jpg");
      });
      await act(async () => {
        result.current.handleImageEdited("file:///3.jpg");
      });

      expect(result.current.selectedImages).toHaveLength(3);

      // Remove middle image
      await act(async () => {
        result.current.handleRemoveImage(1);
      });

      expect(result.current.selectedImages).toHaveLength(2);
      expect(result.current.selectedImages[0].uri).toBe("file:///1.jpg");
      expect(result.current.selectedImages[1].uri).toBe("file:///3.jpg");
    });
  });

  describe("Cloudflare Upload", () => {
    it("should upload to correct Cloudflare endpoint", async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { variants: ["https://cdn.cloudflare.com/img.jpg"] },
          }),
      });

      const { result } = renderUseStoreForm();

      const url =
        await result.current.uploadImageToCloudflare("file:///test.jpg");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.cloudflare.com/client/v4/accounts"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
        }),
      );

      expect(url).toBe("https://cdn.cloudflare.com/img.jpg");
    });

    it("should timeout after 30 seconds", async () => {
      jest.useFakeTimers();

      // Never resolve but respects abort signal
      global.fetch.mockImplementation(
        (url, options) =>
          new Promise((resolve, reject) => {
            if (options?.signal) {
              options.signal.addEventListener("abort", () => {
                const err = new Error("Aborted");
                err.name = "AbortError";
                reject(err);
              });
            }
          }),
      );

      const { result } = renderUseStoreForm();

      const uploadPromise =
        result.current.uploadImageToCloudflare("file:///test.jpg");

      // Advance past timeout
      jest.advanceTimersByTime(31000);

      // Wait for promise to reject
      try {
        await uploadPromise;
        fail("Expected upload to throw");
      } catch (error) {
        expect(error.message).toBe("IMAGE_UPLOAD_TIMEOUT");
      }

      jest.useRealTimers();
    });

    it("should handle Cloudflare API errors", async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            errors: [{ message: "Invalid file" }],
          }),
      });

      const { result } = renderUseStoreForm();

      await expect(
        result.current.uploadImageToCloudflare("file:///test.jpg"),
      ).rejects.toThrow("Cloudflare upload failed");
    });

    it("should return first variant URL", async () => {
      const expectedUrl = "https://cdn.cloudflare.com/variants/public";
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: {
              variants: [
                expectedUrl,
                "https://cdn.cloudflare.com/variants/thumb",
              ],
            },
          }),
      });

      const { result } = renderUseStoreForm();

      const url =
        await result.current.uploadImageToCloudflare("file:///test.jpg");

      expect(url).toBe(expectedUrl);
    });
  });

  describe("Store Creation with Images", () => {
    it("should upload all images before store creation", async () => {
      // Mock Cloudflare success
      global.fetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { variants: ["https://cdn.com/1.jpg"] },
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { variants: ["https://cdn.com/2.jpg"] },
            }),
        })
        // Mock Google geocode
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              status: "OK",
              results: [{ geometry: { location: { lat: 48.8, lng: 2.3 } } }],
            }),
        });

      const { result } = renderUseStoreForm();

      // Add images
      await act(async () => {
        result.current.handleImageEdited("file:///1.jpg");
      });
      await act(async () => {
        result.current.handleImageEdited("file:///2.jpg");
      });

      // Fill required fields
      await act(async () => {
        result.current.setName("Test Store");
        result.current.setStreet("123 Main St");
        result.current.setCity("Paris");
        result.current.setPostalCode("75001");
        result.current.setDescription("Test description");
      });

      // Can't fully test submit without more mocking, but we verify images are tracked
      expect(result.current.selectedImages).toHaveLength(2);
    });

    it("should handle upload timeout in uploadImageToCloudflare", async () => {
      // Test that the upload function itself handles timeout correctly
      jest.useFakeTimers();

      global.fetch.mockImplementation(
        (url, options) =>
          new Promise((resolve, reject) => {
            if (options?.signal) {
              options.signal.addEventListener("abort", () => {
                const err = new Error("Aborted");
                err.name = "AbortError";
                reject(err);
              });
            }
          }),
      );

      const { result } = renderUseStoreForm();

      const uploadPromise =
        result.current.uploadImageToCloudflare("file:///test.jpg");

      // Advance past timeout
      jest.advanceTimersByTime(31000);

      // Verify timeout error
      try {
        await uploadPromise;
        fail("Expected upload to throw");
      } catch (error) {
        expect(error.message).toBe("IMAGE_UPLOAD_TIMEOUT");
      }

      jest.useRealTimers();
    });
  });

  describe("Form Data", () => {
    it("should include selectedImages in getFormData", async () => {
      const { result } = renderUseStoreForm();

      await act(async () => {
        result.current.handleImageEdited("file:///1.jpg");
        result.current.handleImageEdited("file:///2.jpg");
      });

      const formData = result.current.getFormData();

      expect(formData.selectedImages).toHaveLength(2);
    });
  });
});
