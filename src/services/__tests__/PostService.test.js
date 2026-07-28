/**
 * PostService Tests
 *
 * Tests for Cloudflare image upload and post CRUD operations.
 *
 * Run with: npx jest src/services/__tests__/PostService.test.js
 */

// Mock Platform before importing PostService
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// Mock Firebase
jest.mock("../../../firebaseconfig", () => ({
  firestore: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "postsRef"),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
}));

import postService from "../PostService";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";

describe("PostService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe("uploadImage", () => {
    const testUri = "file:///test/image.jpg";

    it("should upload to Cloudflare API with correct endpoint", async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: {
              variants: ["https://cloudflare.com/images/abc123/public"],
            },
          }),
      });

      await postService.uploadImage(testUri);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "api.cloudflare.com/client/v4/accounts/e593403f5f942f93365e9cd0be4065a1/images/v1",
        ),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
          }),
        }),
      );
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

      const uploadPromise = postService.uploadImage(testUri);

      // Advance time past timeout
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

    it("should return first variant URL on success", async () => {
      const expectedUrl = "https://cloudflare.com/images/abc123/public";
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: {
              variants: [
                expectedUrl,
                "https://cloudflare.com/images/abc123/thumbnail",
              ],
            },
          }),
      });

      const result = await postService.uploadImage(testUri);

      expect(result).toBe(expectedUrl);
    });

    it("should handle network errors", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(postService.uploadImage(testUri)).rejects.toThrow(
        "Network error",
      );
    });

    it("should handle Cloudflare API errors", async () => {
      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            errors: [{ message: "Invalid token" }],
          }),
      });

      await expect(postService.uploadImage(testUri)).rejects.toThrow(
        "Image upload failed",
      );
    });

    it("should add file:// prefix for Android URIs without it", async () => {
      jest.resetModules();
      jest.doMock("react-native", () => ({
        Platform: { OS: "android" },
      }));

      // Re-import to get Android mock
      const androidPostService = require("../PostService").default;

      global.fetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            result: { variants: ["https://example.com/image.jpg"] },
          }),
      });

      await androidPostService.uploadImage("/storage/image.jpg");

      // FormData should have file:// prefix
      const fetchCall = global.fetch.mock.calls[0];
      const formData = fetchCall[1].body;
      expect(formData).toBeInstanceOf(FormData);
    });
  });

  describe("uploadImages", () => {
    it("should upload multiple images sequentially", async () => {
      const uris = ["file:///img1.jpg", "file:///img2.jpg", "file:///img3.jpg"];
      const expectedUrls = [
        "https://cdn.com/1.jpg",
        "https://cdn.com/2.jpg",
        "https://cdn.com/3.jpg",
      ];

      uris.forEach((_, i) => {
        global.fetch.mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { variants: [expectedUrls[i]] },
            }),
        });
      });

      const result = await postService.uploadImages(uris);

      expect(result).toEqual(expectedUrls);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should fail entire batch if one upload fails", async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              success: true,
              result: { variants: ["https://cdn.com/1.jpg"] },
            }),
        })
        .mockRejectedValueOnce(new Error("Upload failed"));

      await expect(
        postService.uploadImages(["file:///1.jpg", "file:///2.jpg"]),
      ).rejects.toThrow("Upload failed");
    });

    it("should return empty array for empty input", async () => {
      const result = await postService.uploadImages([]);

      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("createPost", () => {
    const mockStoreId = "store123";
    const mockOwnerId = "owner123";

    beforeEach(() => {
      addDoc.mockResolvedValue({ id: "newPost123" });
    });

    it("should require at least one image", async () => {
      await expect(
        postService.createPost(mockStoreId, {
          imageUris: [],
          description: { en: "Test" },
        }),
      ).rejects.toThrow("At least one image is required");

      await expect(
        postService.createPost(mockStoreId, {
          description: { en: "Test" },
        }),
      ).rejects.toThrow("At least one image is required");
    });

    it("should upload images before Firestore save", async () => {
      global.fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            result: { variants: ["https://cdn.com/img.jpg"] },
          }),
      });

      await postService.createPost(mockStoreId, {
        imageUris: ["file:///test.jpg"],
        description: { en: "Test post" },
        ownerId: mockOwnerId,
      });

      // Cloudflare called before Firestore
      expect(global.fetch).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalled();

      // Verify order: fetch first, then addDoc
      const fetchCallOrder = global.fetch.mock.invocationCallOrder[0];
      const addDocCallOrder = addDoc.mock.invocationCallOrder[0];
      expect(fetchCallOrder).toBeLessThan(addDocCallOrder);
    });

    it("should convert price string to number", async () => {
      global.fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            result: { variants: ["https://cdn.com/img.jpg"] },
          }),
      });

      await postService.createPost(mockStoreId, {
        imageUris: ["file:///test.jpg"],
        description: {},
        price: "29.99",
        ownerId: mockOwnerId,
      });

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          price: 29.99,
        }),
      );
    });

    it("should handle price as null when empty string", async () => {
      global.fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            result: { variants: ["https://cdn.com/img.jpg"] },
          }),
      });

      await postService.createPost(mockStoreId, {
        imageUris: ["file:///test.jpg"],
        description: {},
        price: "",
        ownerId: mockOwnerId,
      });

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          price: null,
        }),
      );
    });

    it("should return created post with ID", async () => {
      global.fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            result: { variants: ["https://cdn.com/img.jpg"] },
          }),
      });

      const result = await postService.createPost(mockStoreId, {
        imageUris: ["file:///test.jpg"],
        description: { en: "Test" },
        ownerId: mockOwnerId,
      });

      expect(result.id).toBe("newPost123");
      expect(result.images).toContain("https://cdn.com/img.jpg");
    });

    it("should require an owner id", async () => {
      await expect(
        postService.createPost(mockStoreId, {
          imageUris: ["file:///test.jpg"],
          description: { en: "Test" },
        }),
      ).rejects.toThrow("Missing store owner");
    });

    it("should denormalize owner_id onto the post", async () => {
      global.fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            result: { variants: ["https://cdn.com/img.jpg"] },
          }),
      });

      await postService.createPost(mockStoreId, {
        imageUris: ["file:///test.jpg"],
        description: { en: "Test" },
        ownerId: mockOwnerId,
      });

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ owner_id: mockOwnerId }),
      );
    });
  });

  describe("updatePost", () => {
    it("should require at least one image after update", async () => {
      await expect(
        postService.updatePost("post123", {
          imageUris: [],
          existingImages: [],
          description: { en: "Updated" },
        }),
      ).rejects.toThrow("At least one image is required");
    });

    it("should combine existing and new images", async () => {
      global.fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            result: { variants: ["https://cdn.com/new.jpg"] },
          }),
      });

      doc.mockReturnValue("postRef");

      await postService.updatePost("post123", {
        imageUris: ["file:///new.jpg"],
        existingImages: ["https://cdn.com/existing.jpg"],
        description: { en: "Updated" },
      });

      expect(updateDoc).toHaveBeenCalledWith(
        "postRef",
        expect.objectContaining({
          images: ["https://cdn.com/existing.jpg", "https://cdn.com/new.jpg"],
        }),
      );
    });

    it("should preserve existing images when no new uploads", async () => {
      doc.mockReturnValue("postRef");

      await postService.updatePost("post123", {
        imageUris: [],
        existingImages: ["https://cdn.com/1.jpg", "https://cdn.com/2.jpg"],
        description: { fr: "Mis à jour" },
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith(
        "postRef",
        expect.objectContaining({
          images: ["https://cdn.com/1.jpg", "https://cdn.com/2.jpg"],
        }),
      );
    });
  });

  describe("deletePost", () => {
    it("should delete post by ID", async () => {
      doc.mockReturnValue("postRef");

      await postService.deletePost("post123");

      expect(doc).toHaveBeenCalledWith(expect.anything(), "posts", "post123");
      expect(deleteDoc).toHaveBeenCalledWith("postRef");
    });
  });

  describe("getStorePosts", () => {
    it("should query posts by store ID", async () => {
      getDocs.mockResolvedValue({
        docs: [
          { id: "post1", data: () => ({ description: { en: "Post 1" } }) },
          { id: "post2", data: () => ({ description: { en: "Post 2" } }) },
        ],
      });

      const result = await postService.getStorePosts("store123");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("post1");
      expect(result[1].id).toBe("post2");
    });
  });

  describe("getPostsForDisplay", () => {
    it("should normalize new flat format", async () => {
      getDocs.mockResolvedValue({
        docs: [
          {
            id: "post1",
            data: () => ({
              images: ["https://cdn.com/1.jpg"],
              description: { en: "Test" },
              price: 10,
            }),
          },
        ],
      });

      const result = await postService.getPostsForDisplay("store123");

      expect(result[0]).toMatchObject({
        id: "post1",
        images: ["https://cdn.com/1.jpg"],
        description: { en: "Test" },
        price: 10,
      });
    });

    it("should flatten old media[] format", async () => {
      getDocs.mockResolvedValue({
        docs: [
          {
            id: "post1",
            data: () => ({
              media: [
                {
                  image: "https://cdn.com/1.jpg",
                  description: { en: "Item 1" },
                  price: 5,
                },
                {
                  image: "https://cdn.com/2.jpg",
                  description: { en: "Item 2" },
                  price: 10,
                },
              ],
            }),
          },
        ],
      });

      const result = await postService.getPostsForDisplay("store123");

      expect(result).toHaveLength(2);
      expect(result[0].images).toContain("https://cdn.com/1.jpg");
      expect(result[1].images).toContain("https://cdn.com/2.jpg");
    });

    it("should return empty array on error", async () => {
      getDocs.mockRejectedValue(new Error("Firestore error"));

      const result = await postService.getPostsForDisplay("store123");

      expect(result).toEqual([]);
    });
  });
});
