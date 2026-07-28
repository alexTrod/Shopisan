/**
 * useStorePosts - React hook for post management
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import postService from "../services/PostService";
import { selectUserData } from "../Redux/Selectors/UserSelectors";

/**
 * Hook for managing store posts
 * @param {string} storeId - Store ID
 * @param {boolean} autoFetch - Fetch posts on mount
 * @returns {Object} Post state and methods
 */
export function useStorePosts(storeId, autoFetch = true) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);
  const user = useSelector(selectUserData);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Fetch posts for the store
   */
  const fetchPosts = useCallback(async () => {
    if (!storeId || !isMounted.current) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedPosts = await postService.getStorePosts(storeId);
      if (isMounted.current) {
        setPosts(fetchedPosts);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err.message || "Failed to fetch posts");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [storeId]);

  /**
   * Create a new post
   */
  const createPost = useCallback(
    async ({ imageUris, description, price, currency }) => {
      if (!storeId) throw new Error("Store ID required");

      setLoading(true);
      setError(null);

      try {
        const newPost = await postService.createPost(storeId, {
          imageUris,
          description,
          price,
          currency,
          // firestore.rules requires owner_id == request.auth.uid, so the
          // post owner is always the signed-in user.
          ownerId: user?.id,
        });

        if (isMounted.current) {
          setPosts((prev) => [newPost, ...prev]);
        }

        return newPost;
      } catch (err) {
        if (isMounted.current) {
          setError(err.message || "Failed to create post");
        }
        throw err;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [storeId, user?.id],
  );

  /**
   * Update an existing post
   */
  const updatePost = useCallback(
    async (
      postId,
      { imageUris, existingImages, description, price, currency },
    ) => {
      setLoading(true);
      setError(null);

      try {
        const updatedPost = await postService.updatePost(postId, {
          imageUris,
          existingImages,
          description,
          price,
          currency,
        });

        if (isMounted.current) {
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, ...updatedPost } : p)),
          );
        }

        return updatedPost;
      } catch (err) {
        if (isMounted.current) {
          setError(err.message || "Failed to update post");
        }
        throw err;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  /**
   * Delete a post
   */
  const deletePost = useCallback(async (postId) => {
    setLoading(true);
    setError(null);

    try {
      await postService.deletePost(postId);

      if (isMounted.current) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err.message || "Failed to delete post");
      }
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Refresh posts
   */
  const refreshPosts = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && storeId) {
      fetchPosts();
    }
  }, [autoFetch, storeId, fetchPosts]);

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    refreshPosts,
    hasPosts: posts.length > 0,
  };
}

export default useStorePosts;
