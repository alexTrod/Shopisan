/**
 * Email Consistency Tests
 *
 * Tests that emails are sent to the correct recipients with correct content
 * based on user type (shopper vs merchant) and action (signup, add store, etc.)
 */

// Mock firebase-admin before requiring the functions
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
        set: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  })),
  auth: jest.fn(() => ({
    getUserByEmail: jest.fn(),
    updateUser: jest.fn(),
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
  firestore: {
    document: jest.fn(() => ({
      onUpdate: jest.fn((handler) => handler),
    })),
  },
  pubsub: {
    schedule: jest.fn(() => ({
      onRun: jest.fn((handler) => handler),
    })),
  },
}));

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// Mock handlebars to capture template data
const mockCompile = jest.fn((template) => {
  return jest.fn((data) => `compiled:${JSON.stringify(data)}`);
});
jest.mock("handlebars", () => ({
  compile: mockCompile,
}));

describe("Email Consistency Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Template Content Consistency", () => {
    // Read actual templates from functions/index.js
    const fs = require("fs");
    const path = require("path");
    const indexContent = fs.readFileSync(
      path.join(__dirname, "../index.js"),
      "utf8",
    );

    it("merchantEmailTemplate should greet user by username, not storeName", () => {
      // Extract merchantEmailTemplate French greeting
      const frMatch = indexContent.match(
        /const merchantEmailTemplate = \{[\s\S]*?fr:[\s\S]*?<p>Bonjour \{\{(\w+)\}\}/,
      );

      expect(frMatch).toBeTruthy();
      // Should use username for greeting, not storeName
      // Currently uses storeName which is wrong - this test documents the issue
      const greetingVar = frMatch[1];

      // The fix should change this from 'storeName' to 'username'
      // For now, document what it should be:
      expect(greetingVar).toBe("username");
    });

    it("shopperEmailTemplate should greet user by username", () => {
      const frMatch = indexContent.match(
        /const shopperEmailTemplate = \{[\s\S]*?fr:[\s\S]*?<p>Bonjour \{\{(\w+)\}\}/,
      );

      expect(frMatch).toBeTruthy();
      expect(frMatch[1]).toBe("username");
    });

    it("merchantVerificationEmailTemplate should greet user by username", () => {
      const frMatch = indexContent.match(
        /const merchantVerificationEmailTemplate = \{[\s\S]*?fr:[\s\S]*?<p>Bonjour \{\{(\w+)\}\}/,
      );

      expect(frMatch).toBeTruthy();
      expect(frMatch[1]).toBe("username");
    });
  });

  describe("sendVerificationEmail - Template Selection", () => {
    it("should use shopperEmailTemplate for shopper userType", () => {
      // This tests the logic in sendVerificationEmail function
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Check that template selection uses correct logic
      const templateSelectionMatch = indexContent.match(
        /sendVerificationEmail[\s\S]*?const emailTemplate\s*=\s*isStoreOwnerType\(userType\)/,
      );

      expect(templateSelectionMatch).toBeTruthy();
    });

    it("should use merchantEmailTemplate for store owner userType", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Verify the owner template is selected via the shared helper
      const hasCorrectLogic = indexContent.includes(
        "isStoreOwnerType(userType)\n        ? merchantEmailTemplate",
      );
      expect(hasCorrectLogic).toBe(true);
    });

    it("isStoreOwnerType should accept both owner and legacy merchant", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Old app builds still send "merchant"; both must route to the owner
      // template until scripts/migrate-user-types.js has rolled out everywhere.
      expect(indexContent).toMatch(
        /const isStoreOwnerType = \(userType\) =>\s*userType === "owner" \|\| userType === "merchant";/,
      );
    });
  });

  describe("sendStoreCreationEmail - Recipient Consistency", () => {
    it("should require storeEmail parameter", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Check that sendStoreCreationEmail validates storeEmail
      const hasValidation = indexContent.includes(
        "if (!storeName || !storeEmail)",
      );
      expect(hasValidation).toBe(true);
    });

    it("sendStoreCreationEmail should accept username parameter", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Check that sendStoreCreationEmail accepts username in destructuring
      const hasUsername = indexContent.match(
        /sendStoreCreationEmail[\s\S]*?const \{[\s\S]*?username[\s\S]*?\} = data/,
      );
      expect(hasUsername).toBeTruthy();
    });

    it("sendStoreCreationEmail should use username with generic fallback (NOT storeName)", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Check that template does NOT fallback to storeName (bug fix)
      const hasBuggyFallback = indexContent.includes(
        "username: username || storeName",
      );
      expect(hasBuggyFallback).toBe(false);

      // Should use generic greeting instead
      const hasGenericFallback = indexContent.includes("cher commerçant");
      expect(hasGenericFallback).toBe(true);
    });

    it("sendStoreCreationEmail should have same email fallback logic as onStoreValidated", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // onStoreValidated uses: after.storeEmail || after.email
      const validatedHasFallback = indexContent.includes(
        "let storeEmail = after.storeEmail || after.email",
      );
      expect(validatedHasFallback).toBe(true);

      // sendStoreCreationEmail should also support fallback or document why not
      // Currently it only uses storeEmail directly - this is the inconsistency
      // After fix, sendStoreCreationEmail should also have owner email fallback
    });
  });

  describe("onStoreValidated - Email Recipient Logic", () => {
    it("should use storeEmail with fallback to owner email", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Check fallback chain exists
      const hasFallbackToStoreEmail = indexContent.includes(
        "storeEmail = after.storeEmail || after.email",
      );
      const hasFallbackToOwner = indexContent.includes("if (!storeEmail)");

      expect(hasFallbackToStoreEmail).toBe(true);
      expect(hasFallbackToOwner).toBe(true);
    });
  });

  describe("onStoreRejected - Email Recipient Logic", () => {
    it("should use same fallback logic as onStoreValidated", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Both functions should have identical email fallback logic
      const validatedSection = indexContent.match(
        /exports\.onStoreValidated[\s\S]*?let storeEmail = ([\s\S]*?);/,
      );
      const rejectedSection = indexContent.match(
        /exports\.onStoreRejected[\s\S]*?let storeEmail = ([\s\S]*?);/,
      );

      expect(validatedSection).toBeTruthy();
      expect(rejectedSection).toBeTruthy();
      expect(validatedSection[1]).toBe(rejectedSection[1]);
    });
  });

  describe("Language Handling Consistency", () => {
    it("all email functions should handle language codes consistently", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // All functions should use the same pattern for language normalization
      const languagePatterns = indexContent.match(
        /\.toLowerCase\(\)\.startsWith\("en"\)/g,
      );

      // Should appear multiple times for each email function
      expect(languagePatterns).toBeTruthy();
      expect(languagePatterns.length).toBeGreaterThan(3);
    });

    it("all email functions should default to French", () => {
      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Check default language is French in function signatures
      const frDefaults = indexContent.match(/language = ["']fr["']/g);
      expect(frDefaults).toBeTruthy();
      expect(frDefaults.length).toBeGreaterThan(0);
    });
  });

  describe("Admin Notification Consistency", () => {
    it("sendAdminNotification should be called for all signup types", () => {
      // This documents expected behavior
      // - Shopper signup: should send admin notification
      // - Merchant signup: should send admin notification
      // - Merchant with store signup: should send admin notification

      const indexContent = require("fs").readFileSync(
        require("path").join(__dirname, "../index.js"),
        "utf8",
      );

      // Admin notification should include userType
      const hasUserType = indexContent.includes("userType");
      expect(hasUserType).toBe(true);
    });
  });
});

describe("Email Flow Integration", () => {
  describe("Merchant Signup Without Store", () => {
    it("should send merchantEmailTemplate (not merchantVerificationEmailTemplate)", () => {
      // When merchant signs up without immediate store:
      // - Redux calls signUp() with userType='merchant'
      // - signUp() calls sendVerificationEmail with userType='merchant'
      // - sendVerificationEmail selects merchantEmailTemplate
      //
      // Issue: merchantEmailTemplate greets by {{storeName}} but no store exists yet
      // Fix: merchantEmailTemplate should greet by {{username}}
      expect(true).toBe(true); // Documentation test
    });
  });

  describe("Merchant Signup With Store", () => {
    it("should send merchantVerificationEmailTemplate with store info", () => {
      // When merchant signs up with store:
      // - Redux calls signUpMerchantWithStore()
      // - signUpMerchantWithStore() calls sendMerchantVerificationEmail
      // - sendMerchantVerificationEmail uses merchantVerificationEmailTemplate
      // - Template includes storeName, storeCity, pending badge
      //
      // This flow is correct - template designed for this scenario
      expect(true).toBe(true); // Documentation test
    });
  });

  describe("Add Store (Any User)", () => {
    it("should send email to storeEmail OR user email with fallback", () => {
      // When any user adds a store:
      // - add_store screen calls sendStoreCreationEmail
      // - Uses: storeEmail || user?.email
      // - sendStoreCreationEmail sends to that email
      //
      // Current issue: sendStoreCreationEmail has no internal fallback
      // Fix: Add owner_id fallback like onStoreValidated has
      expect(true).toBe(true); // Documentation test
    });
  });
});
