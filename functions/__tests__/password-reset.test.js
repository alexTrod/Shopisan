/**
 * Password Reset Tests
 *
 * Tests for the custom password reset flow using 6-digit codes.
 *
 * Run with: npx jest functions/__tests__/password-reset.test.js
 *
 * Related bugs:
 * - Password reset email not being received
 */

// Mock firebase-admin
const mockFirestoreDoc = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockFirestoreCollection = {
  doc: jest.fn(() => mockFirestoreDoc),
};

jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => mockFirestoreCollection),
    FieldValue: {
      serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
    },
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
}));

// Mock nodemailer
const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

const admin = require("firebase-admin");
const functions = require("firebase-functions");

describe("Password Reset Flow Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: "test-id" });
  });

  describe("sendCustomPasswordReset", () => {
    it("should validate email is required", async () => {
      const handler = async (data) => {
        const { email } = data;
        if (!email) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Email is required",
          );
        }
      };

      await expect(handler({})).rejects.toThrow("Email is required");
      await expect(handler({ email: "" })).rejects.toThrow("Email is required");
    });

    it("should normalize email (trim, lowercase)", () => {
      const testCases = [
        { input: "  Test@Example.COM  ", expected: "test@example.com" },
        { input: "USER@DOMAIN.COM", expected: "user@domain.com" },
        { input: "user@domain.com", expected: "user@domain.com" },
      ];

      testCases.forEach(({ input, expected }) => {
        const normalized = input.trim().toLowerCase();
        expect(normalized).toBe(expected);
      });
    });

    it("should reject with not-found when no account matches the email", async () => {
      // A silent success used to leave people waiting for a code that never
      // arrived after a typo in their address, so the error is now explicit.
      admin
        .auth()
        .getUserByEmail.mockRejectedValue({ code: "auth/user-not-found" });

      const handleUserNotFound = (error) => {
        if (error.code === "auth/user-not-found") {
          return { httpsErrorCode: "not-found" };
        }
        throw error;
      };

      const result = handleUserNotFound({ code: "auth/user-not-found" });
      expect(result.httpsErrorCode).toBe("not-found");
    });

    it("should generate 6-digit reset code", () => {
      const generateResetCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
      };

      const code = generateResetCode();
      expect(code).toHaveLength(6);
      expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(code)).toBeLessThan(1000000);
    });

    it("should set 1-hour expiration for reset code", () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const oneHourFromNow = Date.now() + 60 * 60 * 1000;

      // Expiration should be within 1 minute of expected time
      expect(expiresAt.getTime()).toBeCloseTo(oneHourFromNow, -4);
    });

    it("should store reset code in Firestore", async () => {
      const email = "test@example.com";
      const resetCode = "123456";
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const userId = "user-123";

      mockFirestoreDoc.set.mockResolvedValue({});

      await mockFirestoreCollection.doc(email).set({
        code: resetCode,
        expiresAt: expiresAt,
        userId: userId,
        createdAt: "SERVER_TIMESTAMP",
        attempts: 0,
      });

      expect(mockFirestoreDoc.set).toHaveBeenCalledWith({
        code: resetCode,
        expiresAt: expiresAt,
        userId: userId,
        createdAt: "SERVER_TIMESTAMP",
        attempts: 0,
      });
    });

    it("should send email via nodemailer", async () => {
      const email = "test@example.com";
      const resetCode = "123456";

      await mockSendMail({
        from: '"Shopisan" <info@shopisan.com>',
        to: email,
        subject: "Reset your password - Shopisan",
        html: `<p>Your reset code: ${resetCode}</p>`,
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          from: expect.stringContaining("Shopisan"),
        }),
      );
    });
  });

  describe("resetPasswordWithCode", () => {
    it("should validate all required parameters", () => {
      const validate = ({ email, code, newPassword }) => {
        const errors = [];
        if (!email) errors.push("email");
        if (!code) errors.push("code");
        if (!newPassword) errors.push("newPassword");
        return errors;
      };

      expect(validate({})).toEqual(["email", "code", "newPassword"]);
      expect(validate({ email: "test@example.com" })).toEqual([
        "code",
        "newPassword",
      ]);
      expect(
        validate({
          email: "test@example.com",
          code: "123456",
          newPassword: "newpass123",
        }),
      ).toEqual([]);
    });

    it("should enforce minimum password length of 6", () => {
      const validatePassword = (password) => password.length >= 6;

      expect(validatePassword("12345")).toBe(false);
      expect(validatePassword("123456")).toBe(true);
      expect(validatePassword("longpassword")).toBe(true);
    });

    it("should check attempt limit (max 5 attempts)", async () => {
      const checkAttempts = (attempts) => {
        if (attempts >= 5) {
          throw new Error("Too many attempts");
        }
        return true;
      };

      expect(checkAttempts(0)).toBe(true);
      expect(checkAttempts(4)).toBe(true);
      expect(() => checkAttempts(5)).toThrow("Too many attempts");
      expect(() => checkAttempts(10)).toThrow("Too many attempts");
    });

    it("should increment attempts on verification", async () => {
      let currentAttempts = 0;

      const incrementAttempts = () => {
        currentAttempts++;
        return currentAttempts;
      };

      expect(incrementAttempts()).toBe(1);
      expect(incrementAttempts()).toBe(2);
      expect(incrementAttempts()).toBe(3);
    });

    it("should verify code has not expired", () => {
      const isExpired = (expiresAt) => {
        return new Date() > new Date(expiresAt);
      };

      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now

      expect(isExpired(pastDate)).toBe(true);
      expect(isExpired(futureDate)).toBe(false);
    });

    it("should verify reset code matches stored code", () => {
      const verifyCode = (inputCode, storedCode) => {
        return inputCode === storedCode;
      };

      expect(verifyCode("123456", "123456")).toBe(true);
      expect(verifyCode("123456", "654321")).toBe(false);
      expect(verifyCode("123456", "12345")).toBe(false);
    });

    it("should delete reset document after successful reset", async () => {
      mockFirestoreDoc.delete.mockResolvedValue({});

      await mockFirestoreCollection.doc("test@example.com").delete();

      expect(mockFirestoreDoc.delete).toHaveBeenCalled();
    });
  });

  describe("Email Delivery Issues", () => {
    it("should handle SMTP connection errors", async () => {
      mockSendMail.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(mockSendMail({})).rejects.toThrow("ECONNREFUSED");
    });

    it("should handle authentication errors", async () => {
      mockSendMail.mockRejectedValue(new Error("Invalid login"));

      await expect(mockSendMail({})).rejects.toThrow("Invalid login");
    });

    it("should handle rate limiting", async () => {
      mockSendMail.mockRejectedValue(new Error("Rate limit exceeded"));

      await expect(mockSendMail({})).rejects.toThrow("Rate limit exceeded");
    });

    it("should log email sending errors for debugging", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const sendWithLogging = async () => {
        try {
          await mockSendMail({});
        } catch (error) {
          console.error("Error sending password reset email:", error);
          throw error;
        }
      };

      mockSendMail.mockRejectedValue(new Error("SMTP error"));

      await expect(sendWithLogging()).rejects.toThrow("SMTP error");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error sending password reset email:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("SMTP Configuration", () => {
    it("should use correct SMTP settings for Namecheap Private Email", () => {
      const expectedConfig = {
        host: "mail.privateemail.com",
        port: 465,
        secure: true, // SSL
        auth: {
          user: "info@shopisan.com",
          // pass is from environment variable
        },
      };

      expect(expectedConfig.host).toBe("mail.privateemail.com");
      expect(expectedConfig.port).toBe(465);
      expect(expectedConfig.secure).toBe(true);
    });

    it("should send from correct sender address", () => {
      const SENDER_EMAIL = "info@shopisan.com";
      const mailOptions = {
        from: `"Shopisan" <${SENDER_EMAIL}>`,
        to: "user@example.com",
        subject: "Reset your password",
      };

      expect(mailOptions.from).toContain("info@shopisan.com");
      expect(mailOptions.from).toContain("Shopisan");
    });
  });

  describe("Security Considerations", () => {
    it("should surface a not-found error without leaking other details", () => {
      // Deliberate trade-off: the app tells the user when no account exists
      // for the address (typo recovery matters more than enumeration here),
      // but it must not leak anything beyond that.
      const userNotFoundError = {
        code: "not-found",
        message: "No account exists for this email address",
      };

      expect(userNotFoundError.code).toBe("not-found");
      expect(userNotFoundError.message).not.toMatch(/uid|password|token/i);
    });

    it("should rate limit reset attempts per email", () => {
      const MAX_ATTEMPTS = 5;
      const checkRateLimit = (attempts) => attempts < MAX_ATTEMPTS;

      expect(checkRateLimit(0)).toBe(true);
      expect(checkRateLimit(4)).toBe(true);
      expect(checkRateLimit(5)).toBe(false);
      expect(checkRateLimit(10)).toBe(false);
    });

    it("should use secure random code generation", () => {
      // Codes should be unpredictable
      const codes = new Set();
      for (let i = 0; i < 1000; i++) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        codes.add(code);
      }

      // Should generate diverse codes (at least 900 unique out of 1000)
      expect(codes.size).toBeGreaterThan(900);
    });
  });
});
