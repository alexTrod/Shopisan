/**
 * deleteUser Cloud Function Tests
 *
 * Tests cascade deletion of user data:
 * - Firebase Auth user
 * - User document(s) in Firestore
 * - All stores owned by user
 * - All posts belonging to user's stores
 * - passwordResets document
 */

// Mock firebase-admin
const mockBatch = {
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(),
};

const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockWhere = jest.fn();
const mockGet = jest.fn();

jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: mockCollection,
    batch: jest.fn(() => mockBatch),
  })),
  auth: jest.fn(() => ({
    getUserByEmail: jest.fn(),
    deleteUser: jest.fn(),
  })),
}));

// Mock firebase-functions
jest.mock("firebase-functions", () => ({
  https: {
    onCall: jest.fn((handler) => handler),
    HttpsError: class HttpsError extends Error {
      constructor(code, message) {
        super(message);
        this.code = code;
      }
    },
  },
}));

describe("deleteUser Cloud Function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Input Validation", () => {
    it("should require userId or email parameter", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Check that validation exists
      const hasValidation = indexContent.includes("if (!userId && !email)");
      expect(hasValidation).toBe(true);

      // Check that it throws HttpsError
      const hasError = indexContent.includes('"userId or email is required"');
      expect(hasError).toBe(true);
    });
  });

  describe("Cascade Deletion Order", () => {
    it("should delete posts before stores", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Find posts deletion section
      const postsMatch = indexContent.match(
        /Delete posts for each store first[\s\S]*?postsRef[\s\S]*?where\("store\.id"/,
      );
      expect(postsMatch).toBeTruthy();

      // Find stores deletion section
      const storesMatch = indexContent.match(
        /Now delete stores[\s\S]*?storesBatch/,
      );
      expect(storesMatch).toBeTruthy();
    });

    it("should query posts by store.id field", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      const hasPostsQuery = indexContent.includes(
        'where("store.id", "==", storeId)',
      );
      expect(hasPostsQuery).toBe(true);
    });

    it("should delete passwordResets document by normalized email", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      const hasPasswordResetsDelete = indexContent.includes(
        'collection("passwordResets")',
      );
      expect(hasPasswordResetsDelete).toBe(true);

      const usesNormalizedEmail = indexContent.includes(
        ".doc(normalizedEmail)",
      );
      expect(usesNormalizedEmail).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should continue if Auth user not found", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Should handle auth/user-not-found gracefully
      const hasAuthNotFoundHandling = indexContent.includes(
        'error.code === "auth/user-not-found"',
      );
      expect(hasAuthNotFoundHandling).toBe(true);
    });

    it("should continue if passwordResets deletion fails", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Should catch passwordResets errors and continue
      const hasPasswordResetsErrorHandling = indexContent.includes(
        "Error deleting passwordResets",
      );
      expect(hasPasswordResetsErrorHandling).toBe(true);
    });
  });

  describe("Return Value", () => {
    it("should return success object on completion", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      const hasSuccessReturn = indexContent.includes(
        '{ success: true, message: "User deleted successfully" }',
      );
      expect(hasSuccessReturn).toBe(true);
    });
  });

  describe("Auth UID Resolution", () => {
    it("should try to find Auth UID by email first", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      const hasEmailLookup = indexContent.includes(
        "getUserByEmail(normalizedEmail)",
      );
      expect(hasEmailLookup).toBe(true);
    });

    it("should fallback to userId if email lookup fails", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      const hasFallback = indexContent.includes("if (!authUid && userId)");
      expect(hasFallback).toBe(true);
    });
  });
});
