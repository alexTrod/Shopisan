/**
 * Merchant pre-approval flow: Cloud Functions behaviour.
 *
 * Unlike the source-reading suites next to it, this one requires index.js
 * with firebase-admin / firebase-functions / nodemailer mocked and calls the
 * handlers, so it exercises the real templates and branching:
 *
 * - sendMerchantVerificationEmail: "request received" copy, pending badge
 * - sendAdminNotification: optional merchant details + subject
 * - onStoreCreated: auto-publish for approved owners, admin "new store" mail
 * - onMerchantApproved: pending|rejected -> approved only, language, store name
 * - sendEmailChangeVerification / confirmEmailChange: account-takeover guards
 *
 * Run with: npx jest functions/__tests__/merchant-preapproval.test.js
 */

// ---- firebase-admin mock: a tiny in-memory Firestore ------------------------

const mockDocs = {}; // "users/uid" -> data
const mockUpdate = jest.fn();
const mockUpdateUser = jest.fn().mockResolvedValue({});
const mockGetUserByEmail = jest.fn();

const makeDocSnap = (collectionName, id) => {
  const key = `${collectionName}/${id}`;
  const data = mockDocs[key];
  return {
    id,
    exists: data !== undefined,
    data: () => data,
    ref: {
      update: (patch) => {
        mockUpdate(key, patch);
        if (data) Object.assign(data, patch);
        return Promise.resolve();
      },
    },
  };
};

const makeQuery = (collectionName, filters) => ({
  where: (field, _op, value) =>
    makeQuery(collectionName, [...filters, [field, value]]),
  limit: () => makeQuery(collectionName, filters),
  get: async () => {
    const prefix = `${collectionName}/`;
    const docs = Object.keys(mockDocs)
      .filter((k) => k.startsWith(prefix))
      .filter((k) =>
        filters.every(([field, value]) => mockDocs[k][field] === value),
      )
      .map((k) => makeDocSnap(collectionName, k.slice(prefix.length)));
    return { empty: docs.length === 0, docs };
  },
});

const mockFirestore = {
  collection: (name) => ({
    ...makeQuery(name, []),
    doc: (id) => ({
      get: async () => makeDocSnap(name, id),
      update: (patch) => makeDocSnap(name, id).ref.update(patch),
      set: jest.fn(),
    }),
  }),
  batch: jest.fn(),
};

jest.mock("firebase-admin", () => {
  const firestore = jest.fn(() => mockFirestore);
  firestore.FieldValue = { serverTimestamp: () => "SERVER_TIMESTAMP" };
  return {
    initializeApp: jest.fn(),
    firestore,
    auth: jest.fn(() => ({
      getUserByEmail: mockGetUserByEmail,
      updateUser: mockUpdateUser,
    })),
  };
});

// ---- firebase-functions mock: every builder returns the raw handler ---------

jest.mock("firebase-functions", () => {
  class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  const passThrough = (handler) => handler;
  const scheduleBuilder = {
    timeZone: () => scheduleBuilder,
    onRun: passThrough,
  };
  return {
    https: {
      onCall: passThrough,
      onRequest: passThrough,
      HttpsError,
    },
    firestore: {
      document: () => ({ onUpdate: passThrough, onCreate: passThrough }),
    },
    pubsub: {
      schedule: () => scheduleBuilder,
    },
  };
});

const mockSendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const index = require("../index.js");

const resetDocs = () => {
  for (const key of Object.keys(mockDocs)) delete mockDocs[key];
};

const lastMail = () => mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];

describe("Merchant pre-approval Cloud Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDocs();
  });

  describe("onStoreCreated - extra store by an approved owner", () => {
    const ctx = { params: { storeId: "s2" } };
    const baseStore = {
      name: "Zaza 2",
      owner_id: "owner-uid",
      city: "Namur",
      category: ["Mode"],
      status: "pending",
      managerFirstName: "Laurence",
      managerLastName: "W",
      email: "owner@example.com",
    };
    const snapFor = (store) => {
      mockDocs["stores/s2"] = { ...store };
      return makeDocSnap("stores", "s2");
    };

    it("publishes the store and emails only the admin when the owner is approved", async () => {
      mockDocs["users/owner-uid"] = {
        email: "owner@example.com",
        userType: "owner",
        merchantStatus: "approved",
      };
      await index.onStoreCreated(snapFor(baseStore), ctx);
      expect(mockUpdate).toHaveBeenCalledWith(
        "stores/s2",
        expect.objectContaining({
          status: "approved",
          approved_by: "auto:owner-approved",
        }),
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mail = lastMail();
      expect(mail.to).toBe("info@shopisan.com");
      expect(mail.subject).toBe("New store published: Zaza 2");
      expect(mail.html).toContain("New store published");
      expect(mail.html).toContain("live in the app now");
      expect(mail.html).toContain("Laurence W");
      expect(mail.html).toContain("Namur");
      expect(mail.html).toContain("Mode");
    });

    it("treats a legacy owner without merchantStatus as approved", async () => {
      mockDocs["users/owner-uid"] = { email: "owner@example.com", userType: "owner" };
      await index.onStoreCreated(snapFor(baseStore), ctx);
      expect(mockUpdate).toHaveBeenCalledWith(
        "stores/s2",
        expect.objectContaining({ status: "approved" }),
      );
      expect(lastMail().subject).toBe("New store published: Zaza 2");
    });

    it("finds the owner by the users-doc id field when the doc id differs", async () => {
      mockDocs["users/legacy-doc"] = {
        id: "owner-uid",
        email: "owner@example.com",
        userType: "owner",
        merchantStatus: "approved",
      };
      await index.onStoreCreated(snapFor(baseStore), ctx);
      expect(mockUpdate).toHaveBeenCalledWith(
        "stores/s2",
        expect.objectContaining({ status: "approved" }),
      );
    });

    it("leaves the store pending and says so when the owner is still pending", async () => {
      mockDocs["users/owner-uid"] = {
        email: "owner@example.com",
        userType: "owner",
        merchantStatus: "pending",
      };
      await index.onStoreCreated(snapFor(baseStore), ctx);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockDocs["stores/s2"].status).toBe("pending");
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mail = lastMail();
      expect(mail.to).toBe("info@shopisan.com");
      expect(mail.subject).toBe("New store waiting: Zaza 2");
      expect(mail.html).toContain("still waiting for approval");
      expect(mail.html).not.toMatch(/is live|live in the app/i);
    });

    it("does nothing for ownerless (catalog) stores", async () => {
      await index.onStoreCreated(
        snapFor({ ...baseStore, owner_id: undefined }),
        ctx,
      );
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("sendStoreCreationEmail (old builds) no longer mails anyone", async () => {
      const result = await index.sendStoreCreationEmail(
        { storeName: "Zaza 2", storeEmail: "owner@example.com" },
        {},
      );
      expect(result.success).toBe(true);
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe("shared email footer", () => {
    it("links the open-app page, never the one-time verification link", async () => {
      await index.sendVerificationEmail(
        {
          email: "s@example.com",
          username: "Sam",
          token: "tok123",
          userType: "user",
          language: "fr",
        },
        {},
      );
      const html = lastMail().html;
      const footer = html.slice(html.lastIndexOf("border-top: 1px solid #eeeeee"));
      expect(footer).toContain('href="https://shopisan-bad76.web.app/open"');
      expect(footer).toContain("Ouvrir l'application");
      expect(footer).toContain('href="https://shopisan.com"');
      expect(footer).toContain('href="https://instagram.com/shopisanapp"');
      expect(footer).not.toContain("verify-email");
      // Store URLs are empty until the listings are confirmed: no buttons.
      expect(footer).not.toContain("Google Play");
      expect(footer).not.toContain("App Store");
      expect(html).not.toContain("apps.apple.com");
      // The verification link still exists, as a body button.
      // (Handlebars HTML-escapes "=" in the href; browsers decode it.)
      expect(html).toMatch(/verify-email\?token(=|&#x3D;)tok123/);
    });

    it("drops the 'add your favourite shops' line from the shopper email", async () => {
      await index.sendVerificationEmail(
        {
          email: "s@example.com",
          username: "Sam",
          token: "tok",
          userType: "user",
          language: "en",
        },
        {},
      );
      const html = lastMail().html;
      expect(html).toContain("feel free to tell people around you about it.");
      expect(html).not.toContain("add your favorite shops");
      expect(html).toContain("Open the app");
    });
  });

  describe("verifyEmail - error passthrough", () => {
    it("surfaces an invalid / already used token as not-found", async () => {
      await expect(index.verifyEmail({ token: "used" }, {})).rejects.toMatchObject({
        code: "not-found",
        message: "Invalid verification token",
      });
    });
  });

  describe("sendMerchantVerificationEmail - request received copy", () => {
    const call = (language) =>
      index.sendMerchantVerificationEmail(
        {
          email: "owner@example.com",
          username: "Laurence",
          token: "tok",
          storeName: "Zaza",
          storeCity: "Namur",
          language,
        },
        {},
      );

    it("sends the FR request-received email with a pending badge", async () => {
      await call("fr");
      const mail = lastMail();
      expect(mail.to).toBe("owner@example.com");
      expect(mail.subject).toBe("Bienvenue sur Shopisan 🚀");
      expect(mail.html).toContain("<p>Bonjour Laurence,</p>");
      expect(mail.html).toContain("Zaza");
      expect(mail.html).toContain("Namur");
      expect(mail.html).toContain("En attente de validation");
      expect(mail.html).toContain("sera validée prochainement");
      // Handlebars HTML-escapes "=" inside the href; browsers decode it.
      expect(mail.html).toMatch(/verify-email\?token(=|&#x3D;)tok/);
      expect(mail.html).not.toContain("En ligne");
      expect(mail.html).not.toContain("visible sur la carte");
    });

    it("sends the EN request-received email with a pending badge", async () => {
      await call("en-US");
      const mail = lastMail();
      expect(mail.subject).toBe("Welcome to Shopisan 🚀");
      expect(mail.html).toContain("<p>Hello Laurence,</p>");
      expect(mail.html).toContain("Pending validation");
      expect(mail.html).toContain("will be validated shortly by our team");
      expect(mail.html).toContain("set up your account");
      expect(mail.html).not.toContain(">Live<");
      expect(mail.html).not.toContain("already visible");
    });

    it("defaults to French", async () => {
      await call(undefined);
      expect(lastMail().subject).toBe("Bienvenue sur Shopisan 🚀");
    });
  });

  describe("sendAdminNotification - merchant request details", () => {
    it("keeps the plain registration email when no details are sent", async () => {
      await index.sendAdminNotification(
        { email: "s@example.com", username: "Shopper", userType: "user" },
        {},
      );
      const mail = lastMail();
      expect(mail.to).toBe("info@shopisan.com");
      expect(mail.subject).toBe("New user registration");
      expect(mail.html).toContain("New user registered");
      expect(mail.html).toContain("Type: user");
      expect(mail.html).not.toContain("Store owner details");
    });

    it("lists every merchant field and names the store in the subject", async () => {
      await index.sendAdminNotification(
        {
          email: "owner@example.com",
          username: "Laurence",
          userType: "owner",
          details: {
            name: "Laurence",
            surname: "Wandela",
            phone: "+32470000000",
            companyNumber: "BE0123456789",
            storeName: "Zaza",
            storeAddress: "Rue de Fer 12, 5000 Namur",
            storeCity: "Namur",
            website: "https://zaza.be",
          },
        },
        {},
      );
      const mail = lastMail();
      expect(mail.subject).toBe("New store owner request: Zaza");
      expect(mail.html).toContain("New store owner request");
      expect(mail.html).toContain("Type: owner");
      expect(mail.html).toContain("First name: Laurence");
      expect(mail.html).toContain("Last name: Wandela");
      expect(mail.html).toContain("Phone: +32470000000");
      expect(mail.html).toContain("Company number: BE0123456789");
      expect(mail.html).toContain("Store name: Zaza");
      expect(mail.html).toContain("Address: Rue de Fer 12, 5000 Namur");
      expect(mail.html).toContain("City: Namur");
      expect(mail.html).toContain("Website: https://zaza.be");
    });

    it("renders missing detail fields as a dash and drops unknown keys", async () => {
      await index.sendAdminNotification(
        {
          email: "owner@example.com",
          username: "Laurence",
          userType: "owner",
          details: {
            storeName: "Zaza",
            website: "",
            injected: "<script>alert(1)</script>",
          },
        },
        {},
      );
      const mail = lastMail();
      expect(mail.html).toContain("Website: -");
      expect(mail.html).toContain("Phone: -");
      expect(mail.html).not.toContain("injected");
      expect(mail.html).not.toContain("<script>");
    });

    it("still requires email, username and userType", async () => {
      await expect(
        index.sendAdminNotification({ email: "x@example.com" }, {}),
      ).rejects.toMatchObject({ code: "internal" });
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe("onMerchantApproved", () => {
    const change = (before, after) => ({
      before: { data: () => before },
      after: { data: () => after },
    });
    const ctx = { params: { userId: "owner-uid" } };
    const baseUser = {
      email: "owner@example.com",
      username: "Laurence",
      userType: "owner",
    };

    it("emails the owner with the store name on pending -> approved (FR)", async () => {
      mockDocs["stores/s1"] = { name: "Zaza", owner_id: "owner-uid" };
      await index.onMerchantApproved(
        change(
          { ...baseUser, merchantStatus: "pending" },
          { ...baseUser, merchantStatus: "approved", language: "fr" },
        ),
        ctx,
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mail = lastMail();
      expect(mail.to).toBe("owner@example.com");
      expect(mail.subject).toBe(
        "Votre boutique est maintenant en ligne sur Shopisan !",
      );
      expect(mail.html).toContain("<p>Bonjour Zaza,</p>");
      expect(mail.html).toContain("a été validée");
      expect(mail.html).toContain("Accéder à mon compte");
      expect(mail.html).toContain("info@shopisan.com");
    });

    it("also emails on rejected -> approved (admin reconsidered)", async () => {
      mockDocs["stores/s1"] = { name: "Zaza", owner_id: "owner-uid" };
      await index.onMerchantApproved(
        change(
          { ...baseUser, merchantStatus: "rejected" },
          { ...baseUser, merchantStatus: "approved", language: "fr" },
        ),
        ctx,
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(lastMail().subject).toBe(
        "Votre boutique est maintenant en ligne sur Shopisan !",
      );
    });

    it("uses the EN template from `locale` when `language` is absent", async () => {
      mockDocs["stores/s1"] = { name: "Zaza", owner_id: "owner-uid" };
      await index.onMerchantApproved(
        change(
          { ...baseUser, merchantStatus: "pending" },
          { ...baseUser, merchantStatus: "approved", locale: "en-GB" },
        ),
        ctx,
      );
      const mail = lastMail();
      expect(mail.subject).toBe("Your store is now live on Shopisan!");
      expect(mail.html).toContain("<p>Hello Zaza,</p>");
      expect(mail.html).toContain("has been validated");
      expect(mail.html).toContain("Access my account");
    });

    it("falls back to the username when the owner has no store yet", async () => {
      await index.onMerchantApproved(
        change(
          { ...baseUser, merchantStatus: "pending" },
          { ...baseUser, merchantStatus: "approved" },
        ),
        ctx,
      );
      expect(lastMail().html).toContain("<p>Bonjour Laurence,</p>");
    });

    it("ignores another owner's store", async () => {
      mockDocs["stores/s2"] = { name: "NotMine", owner_id: "someone-else" };
      await index.onMerchantApproved(
        change(
          { ...baseUser, merchantStatus: "pending" },
          { ...baseUser, merchantStatus: "approved" },
        ),
        ctx,
      );
      expect(lastMail().html).not.toContain("NotMine");
    });

    it.each([
      ["approved -> approved", "approved", "approved"],
      ["pending -> rejected", "pending", "rejected"],
      ["pending -> pending", "pending", "pending"],
      ["legacy (no field) -> approved", undefined, "approved"],
    ])("does not send on %s", async (_label, beforeStatus, afterStatus) => {
      const result = await index.onMerchantApproved(
        change(
          { ...baseUser, merchantStatus: beforeStatus },
          { ...baseUser, merchantStatus: afterStatus },
        ),
        ctx,
      );
      expect(result).toBeNull();
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("returns null without throwing when the user has no email", async () => {
      const result = await index.onMerchantApproved(
        change(
          { username: "x", merchantStatus: "pending" },
          { username: "x", merchantStatus: "approved" },
        ),
        ctx,
      );
      expect(result).toBeNull();
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("swallows mailer failures (trigger must not retry forever)", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("smtp down"));
      const result = await index.onMerchantApproved(
        change(
          { ...baseUser, merchantStatus: "pending" },
          { ...baseUser, merchantStatus: "approved" },
        ),
        ctx,
      );
      expect(result).toBeNull();
    });
  });

  describe("sendEmailChangeVerification - caller must own the account", () => {
    const payload = {
      userId: "victim-uid",
      oldEmail: "victim@example.com",
      newEmail: "attacker@example.com",
      username: "Victim",
    };

    it("rejects unauthenticated callers", async () => {
      await expect(
        index.sendEmailChangeVerification(payload, {}),
      ).rejects.toMatchObject({ code: "unauthenticated" });
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("rejects a caller targeting another user's document", async () => {
      await expect(
        index.sendEmailChangeVerification(payload, {
          auth: { uid: "attacker-uid" },
        }),
      ).rejects.toMatchObject({ code: "permission-denied" });
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("writes the token on the caller's own document and mails the new address", async () => {
      mockDocs["users/victim-uid"] = { email: "victim@example.com" };
      mockGetUserByEmail.mockRejectedValueOnce({ code: "auth/user-not-found" });

      const result = await index.sendEmailChangeVerification(payload, {
        auth: { uid: "victim-uid" },
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const [key, patch] = mockUpdate.mock.calls[0];
      expect(key).toBe("users/victim-uid");
      expect(patch.emailChangeToken).toMatch(/^[0-9a-f]{64}$/);
      expect(patch.emailChangeNewEmail).toBe("attacker@example.com");
      expect(lastMail().to).toBe("attacker@example.com");
      // Handlebars HTML-escapes "=" and "&" inside the href; browsers decode.
      expect(lastMail().html).toContain(patch.emailChangeToken);
      expect(lastMail().html).toMatch(/userId(=|&#x3D;)victim-uid/);
    });

    it("refuses a new email that already belongs to an Auth account", async () => {
      mockGetUserByEmail.mockResolvedValueOnce({ uid: "other" });
      await expect(
        index.sendEmailChangeVerification(payload, {
          auth: { uid: "victim-uid" },
        }),
      ).rejects.toMatchObject({ code: "already-exists" });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("confirmEmailChange - token lookup", () => {
    const future = () => ({ toDate: () => new Date(Date.now() + 60 * 60 * 1000) });
    const past = () => ({ toDate: () => new Date(Date.now() - 60 * 60 * 1000) });

    beforeEach(() => {
      mockDocs["users/victim-uid"] = {
        email: "victim@example.com",
        emailChangeToken: "good-token",
        emailChangeNewEmail: "new@example.com",
        emailChangeExpiresAt: future(),
      };
      mockDocs["users/other-uid"] = {
        email: "other@example.com",
        emailChangeToken: "other-token",
        emailChangeNewEmail: "other-new@example.com",
        emailChangeExpiresAt: future(),
      };
    });

    it("changes the email when token and userId agree, then clears the token", async () => {
      const result = await index.confirmEmailChange(
        { token: "good-token", userId: "victim-uid" },
        {},
      );
      expect(result).toMatchObject({ success: true, newEmail: "new@example.com" });
      expect(mockUpdateUser).toHaveBeenCalledWith("victim-uid", {
        email: "new@example.com",
        emailVerified: true,
      });
      expect(mockUpdate).toHaveBeenCalledWith("users/victim-uid", {
        email: "new@example.com",
        emailChangeToken: null,
        emailChangeNewEmail: null,
        emailChangeExpiresAt: null,
        pendingEmail: null,
      });
      expect(mockDocs["users/victim-uid"].emailChangeToken).toBeNull();
    });

    it("is single-use: the same token is refused a second time", async () => {
      await index.confirmEmailChange(
        { token: "good-token", userId: "victim-uid" },
        {},
      );
      await expect(
        index.confirmEmailChange(
          { token: "good-token", userId: "victim-uid" },
          {},
        ),
      ).rejects.toMatchObject({ code: "invalid-argument" });
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
    });

    it("rejects an unknown token without touching any account", async () => {
      await expect(
        index.confirmEmailChange(
          { token: "guess", userId: "victim-uid" },
          {},
        ),
      ).rejects.toMatchObject({ code: "invalid-argument" });
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects a valid token paired with a different userId", async () => {
      // A token mailed for one account must never move another account's
      // email, whatever userId the link carries.
      await expect(
        index.confirmEmailChange(
          { token: "other-token", userId: "victim-uid" },
          {},
        ),
      ).rejects.toMatchObject({ code: "invalid-argument" });
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockDocs["users/victim-uid"].email).toBe("victim@example.com");
      expect(mockDocs["users/other-uid"].email).toBe("other@example.com");
    });

    it("rejects an expired token", async () => {
      mockDocs["users/victim-uid"].emailChangeExpiresAt = past();
      await expect(
        index.confirmEmailChange(
          { token: "good-token", userId: "victim-uid" },
          {},
        ),
      ).rejects.toMatchObject({ code: "invalid-argument" });
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("rejects a non-string token (no query on null/objects)", async () => {
      await expect(
        index.confirmEmailChange({ token: null, userId: "victim-uid" }, {}),
      ).rejects.toMatchObject({ code: "invalid-argument" });
      await expect(
        index.confirmEmailChange(
          { token: { "==": "x" }, userId: "victim-uid" },
          {},
        ),
      ).rejects.toMatchObject({ code: "invalid-argument" });
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });
});
