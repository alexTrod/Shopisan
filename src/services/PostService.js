/**
 * PostService - Singleton service for post CRUD operations
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../../firebaseconfig";
import { Platform } from "react-native";

class PostService {
  constructor() {
    this.cloudflareAccountId = "e593403f5f942f93365e9cd0be4065a1";
    this.cloudflareApiToken = "mPV6icwf2TUu5e3KWXCRT1L8bo7_0hmg9zqGyi4K";
  }

  /**
   * Upload image to Cloudflare
   * @param {string} uri - Local image URI
   * @returns {Promise<string>} - Cloudflare URL
   */
  async uploadImage(uri) {
    const fileName = `post_${Date.now()}.jpg`;
    const imageUri =
      Platform.OS === "android" && !uri.startsWith("file://")
        ? `file://${uri}`
        : uri;

    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: fileName,
      type: "image/jpeg",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/images/v1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.cloudflareApiToken}`,
          },
          body: formData,
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!data.success) {
        console.error("[PostService] Cloudflare error:", data.errors);
        throw new Error("Image upload failed");
      }

      return data.result.variants[0];
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("IMAGE_UPLOAD_TIMEOUT");
      }
      throw error;
    }
  }

  /**
   * Upload multiple images sequentially
   * @param {string[]} uris - Array of local URIs
   * @returns {Promise<string[]>} - Array of Cloudflare URLs
   */
  async uploadImages(uris) {
    const urls = [];
    for (const uri of uris) {
      const url = await this.uploadImage(uri);
      urls.push(url);
    }
    return urls;
  }

  /**
   * Create a new post
   * @param {string} storeId - Store ID
   * @param {Object} postData - Post data
   * @param {string[]} postData.imageUris - Local image URIs to upload
   * @param {Object} postData.description - { en?: string, fr?: string }
   * @param {number} [postData.price] - Optional price
   * @returns {Promise<Object>} - Created post with ID
   */
  async createPost(storeId, { imageUris, description, price }) {
    try {
      // Validate at least one image
      if (!imageUris || imageUris.length === 0) {
        throw new Error("At least one image is required");
      }

      // Upload images
      const images = await this.uploadImages(imageUris);

      const postData = {
        store: { id: storeId },
        images,
        description: description || {},
        price: price !== undefined && price !== "" ? Number(price) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const postsRef = collection(firestore, "posts");
      const docRef = await addDoc(postsRef, postData);

      return {
        id: docRef.id,
        ...postData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("[PostService] Create post error:", error);
      throw error;
    }
  }

  /**
   * Get all posts for a store
   * @param {string} storeId - Store ID
   * @returns {Promise<Array>} - Array of posts
   */
  async getStorePosts(storeId) {
    try {
      const postsRef = collection(firestore, "posts");
      const q = query(
        postsRef,
        where("store.id", "==", storeId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("[PostService] Get store posts error:", error);
      throw error;
    }
  }

  /**
   * Update an existing post
   * @param {string} postId - Post ID
   * @param {Object} updates - Fields to update
   * @param {string[]} [updates.imageUris] - New local URIs to upload
   * @param {string[]} [updates.existingImages] - Existing image URLs to keep
   * @param {Object} [updates.description] - { en?: string, fr?: string }
   * @param {number} [updates.price] - Price
   * @returns {Promise<Object>} - Updated post
   */
  async updatePost(
    postId,
    { imageUris = [], existingImages = [], description, price },
  ) {
    try {
      // Upload new images
      let newImageUrls = [];
      if (imageUris.length > 0) {
        newImageUrls = await this.uploadImages(imageUris);
      }

      // Combine existing and new images
      const images = [...existingImages, ...newImageUrls];

      if (images.length === 0) {
        throw new Error("At least one image is required");
      }

      const updateData = {
        images,
        description: description || {},
        price: price !== undefined && price !== "" ? Number(price) : null,
        updatedAt: serverTimestamp(),
      };

      const postRef = doc(firestore, "posts", postId);
      await updateDoc(postRef, updateData);

      return {
        id: postId,
        ...updateData,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("[PostService] Update post error:", error);
      throw error;
    }
  }

  /**
   * Delete a post
   * @param {string} postId - Post ID
   * @returns {Promise<void>}
   */
  async deletePost(postId) {
    try {
      const postRef = doc(firestore, "posts", postId);
      await deleteDoc(postRef);
    } catch (error) {
      console.error("[PostService] Delete post error:", error);
      throw error;
    }
  }

  /**
   * Get posts for display - handles both old media[] format and new flat format
   * @param {string} storeId - Store ID
   * @returns {Promise<Array>} - Normalized array of post items for display
   */
  async getPostsForDisplay(storeId) {
    try {
      const posts = await this.getStorePosts(storeId);

      // Normalize posts to display format
      const displayItems = [];

      for (const post of posts) {
        // New flat format
        if (post.images && Array.isArray(post.images)) {
          displayItems.push({
            id: post.id,
            images: post.images,
            description: post.description || {},
            price: post.price,
            createdAt: post.createdAt,
          });
        }
        // Old media[] format - flatten
        else if (post.media && Array.isArray(post.media)) {
          for (const mediaItem of post.media) {
            displayItems.push({
              id: post.id,
              images:
                mediaItem.images || (mediaItem.image ? [mediaItem.image] : []),
              description: mediaItem.description || {},
              price: mediaItem.price,
              createdAt: post.createdAt,
            });
          }
        }
      }

      return displayItems;
    } catch (error) {
      console.error("[PostService] Get posts for display error:", error);
      return [];
    }
  }
}

const postService = new PostService();
export default postService;
