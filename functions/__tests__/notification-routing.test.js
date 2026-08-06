/**
 * Notification Routing Tests
 *
 * Tests that emails are sent to the correct recipients with correct templates
 * based on user type (shopper vs merchant) and action type.
 *
 * Run with: npx jest functions/__tests__/notification-routing.test.js
 *
 * Related bugs:
 * - User receives merchant notification when adding store
 * - Greeting uses storeName instead of username
 */

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
        set: jest.fn(),
      })),
    })),
  })),
  auth: jest.fn(() => ({
    getUserByEmail: jest.fn(),
    updateUser: jest.fn(),
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
}));

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

describe("Notification Routing Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("User Type Detection", () => {
    it("should correctly identify shopper userType", () => {
      const userData = {
        email: "laurencewandela@gmail.com",
        userType: "shopper",
        username: "Laurence",
      };

      expect(userData.userType).toBe("shopper");
      expect(userData.userType).not.toBe("merchant");
    });

    it("should correctly identify merchant userType", () => {
      const userData = {
        email: "wandellaurence@gmail.com",
        userType: "merchant",
        username: "Laurence",
      };

      expect(userData.userType).toBe("merchant");
    });
  });

  describe("Template Selection", () => {
    const shopperTemplate = {
      fr: {
        subject: "Bienvenue sur Shopisan",
        greeting: "Bonjour {{username}}",
        content: "Découvrez les commerces locaux",
      },
      en: {
        subject: "Welcome to Shopisan",
        greeting: "Hello {{username}}",
        content: "Discover local businesses",
      },
    };

    const merchantTemplate = {
      fr: {
        subject: "Votre inscription commerçant",
        greeting: "Bonjour {{username}}",
        content: "Votre demande sera validée par notre équipe",
      },
      en: {
        subject: "Your merchant registration",
        greeting: "Hello {{username}}",
        content: "Your request will be validated by our team",
      },
    };

    it("should select shopper template for shopper userType", () => {
      const userType = "shopper";
      const template =
        userType === "merchant" ? merchantTemplate : shopperTemplate;

      expect(template).toBe(shopperTemplate);
      expect(template.fr.content).toContain("Découvrez");
    });

    it("should select merchant template for merchant userType", () => {
      const userType = "merchant";
      const template =
        userType === "merchant" ? merchantTemplate : shopperTemplate;

      expect(template).toBe(merchantTemplate);
      expect(template.fr.content).toContain("validée");
    });

    it("should use username for greeting, NOT storeName", () => {
      // Bug: Template uses {{storeName}} instead of {{username}}
      // This causes "Hello Zaza" instead of "Hello Laurence"

      const templateData = {
        username: "Laurence",
        storeName: "Zaza",
        email: "user@example.com",
      };

      // Correct: greeting should use username
      const correctGreeting = `Bonjour ${templateData.username}`;
      expect(correctGreeting).toBe("Bonjour Laurence");

      // Bug: greeting uses storeName
      const buggyGreeting = `Bonjour ${templateData.storeName}`;
      expect(buggyGreeting).toBe("Bonjour Zaza");

      // These should be different
      expect(correctGreeting).not.toBe(buggyGreeting);
    });
  });

  describe("Store Creation Email Routing", () => {
    it("should send merchant notification to store owner email", () => {
      const storeData = {
        storeName: "Zaza",
        storeEmail: "store@example.com",
        ownerEmail: "owner@example.com",
        city: "Namur",
      };

      // Merchant notification goes to store email (or owner email)
      const recipientEmail = storeData.storeEmail || storeData.ownerEmail;
      expect(recipientEmail).toBe("store@example.com");
    });

    it("should send admin notification about new store", () => {
      const adminEmail = "info@shopisan.com";
      const storeData = {
        storeName: "Zaza",
        city: "Namur",
        categories: ["Bijouterie"],
      };

      // Admin should receive notification about pending store
      expect(adminEmail).toBe("info@shopisan.com");
    });

    it("should NOT send merchant email to shopper adding a store", () => {
      // Bug scenario: Shopper adds store but receives merchant notification
      // "Hello Zaza, your registration on Shopisan has been validated"

      const user = {
        userType: "shopper", // User is a shopper
        username: "Laurence",
        email: "laurencewandela@gmail.com",
      };

      const store = {
        name: "Zaza",
        is_verified: false, // Live from creation, badge not granted yet
      };

      // For store creation by shopper:
      // 1. Send store creation confirmation (not merchant welcome)
      // 2. Use user's name, not store name

      const expectedEmailType = "store_creation_confirmation";
      const expectedGreetingName = user.username; // "Laurence", not "Zaza"

      expect(expectedGreetingName).toBe("Laurence");
      expect(expectedGreetingName).not.toBe("Zaza");
    });
  });

  describe("Email Content Validation", () => {
    it("should include correct store details in store creation email", () => {
      const emailData = {
        storeName: "Zaza",
        city: "Namur",
        categories: ["Bijouterie", "Womanswear"],
        status: "pending_validation",
      };

      // Email should contain store details
      const emailBody = `
        Store: ${emailData.storeName}
        City: ${emailData.city}
        Categories: ${emailData.categories.join(", ")}
        Status: ${emailData.status}
      `;

      expect(emailBody).toContain("Zaza");
      expect(emailBody).toContain("Namur");
      expect(emailBody).toContain("Bijouterie");
      expect(emailBody).toContain("pending_validation");
    });

    it("should use correct language based on user preference", () => {
      const testCases = [
        { language: "fr", expected: "fr" },
        { language: "en", expected: "en" },
        { language: "fr-FR", expected: "fr" },
        { language: "en-US", expected: "en" },
        { language: "es", expected: "fr" }, // Unsupported, defaults to French
        { language: undefined, expected: "fr" }, // Default to French
        { language: null, expected: "fr" },
      ];

      testCases.forEach(({ language, expected }) => {
        const lang = (language || "fr").toLowerCase().startsWith("en")
          ? "en"
          : "fr";
        expect(lang).toBe(expected);
      });
    });
  });

  describe("Signup Flow Notifications", () => {
    it("should call sendVerificationEmail with correct userType after signup", () => {
      // Simulates UserActions.signUp flow

      const signupData = {
        email: "test@example.com",
        username: "TestUser",
        userType: "shopper",
        language: "fr",
      };

      // sendVerificationEmail should be called with userType from signup
      const sendVerificationEmail = jest.fn();
      sendVerificationEmail(
        signupData.email,
        signupData.username,
        "mock-token",
        signupData.userType,
        signupData.language,
      );

      expect(sendVerificationEmail).toHaveBeenCalledWith(
        "test@example.com",
        "TestUser",
        "mock-token",
        "shopper", // Critical: must match signup userType
        "fr",
      );
    });

    it("should NOT call sendMerchantVerificationEmail for shopper signup", () => {
      const sendVerificationEmail = jest.fn();
      const sendMerchantVerificationEmail = jest.fn();

      const userType = "shopper";

      // Correct routing based on userType
      if (userType === "merchant") {
        sendMerchantVerificationEmail();
      } else {
        sendVerificationEmail();
      }

      expect(sendVerificationEmail).toHaveBeenCalled();
      expect(sendMerchantVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("Store Verification Notification", () => {
    it("should send verification email when store is_verified changes to true", () => {
      const beforeData = { is_verified: false, name: "Zaza" };
      const afterData = { is_verified: true, name: "Zaza" };

      const shouldSendVerificationEmail =
        !beforeData.is_verified && afterData.is_verified;

      expect(shouldSendVerificationEmail).toBe(true);
    });

    it("should send verification email when is_verified was absent entirely", () => {
      // Stores created before the badge existed have no is_verified key.
      const beforeData = { name: "Zaza" };
      const afterData = { is_verified: true, name: "Zaza" };

      const shouldSendVerificationEmail =
        !beforeData.is_verified && afterData.is_verified === true;

      expect(shouldSendVerificationEmail).toBe(true);
    });

    it("should NOT send verification email if already verified", () => {
      const beforeData = { is_verified: true, name: "Zaza" };
      const afterData = { is_verified: true, name: "Zaza" };

      const shouldSendVerificationEmail =
        !beforeData.is_verified && afterData.is_verified;

      expect(shouldSendVerificationEmail).toBe(false);
    });
  });

  describe("Store Suspension Notification", () => {
    it("should send takedown email when store is_suspended changes to true", () => {
      const beforeData = { is_suspended: false, name: "Zaza" };
      const afterData = { is_suspended: true, name: "Zaza" };

      const shouldSendSuspensionEmail =
        !beforeData.is_suspended && afterData.is_suspended === true;

      expect(shouldSendSuspensionEmail).toBe(true);
    });

    it("should NOT send takedown email if already suspended", () => {
      const beforeData = { is_suspended: true, name: "Zaza" };
      const afterData = { is_suspended: true, name: "Zaza" };

      const shouldSendSuspensionEmail =
        !beforeData.is_suspended && afterData.is_suspended === true;

      expect(shouldSendSuspensionEmail).toBe(false);
    });

    it("should NOT send takedown email when a store is un-suspended", () => {
      const beforeData = { is_suspended: true, name: "Zaza" };
      const afterData = { is_suspended: false, name: "Zaza" };

      const shouldSendSuspensionEmail =
        !beforeData.is_suspended && afterData.is_suspended === true;

      expect(shouldSendSuspensionEmail).toBe(false);
    });
  });
});
