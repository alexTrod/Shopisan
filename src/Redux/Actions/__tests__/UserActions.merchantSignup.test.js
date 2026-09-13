/**
 * signUpMerchantWithStore Action Tests
 *
 * Static-analysis tests (same approach as UserActions.deleteAccount.test.js)
 * for the merchant pre-approval signup.
 *
 * Guards the ordering the flow depends on: the address is geocoded before
 * any account exists, the users doc is written pending, the store carries
 * the pre-approval defaults, and a failure rolls back store doc -> users
 * doc -> Auth user before onAuthStateChanged may act again.
 *
 * Run with: npx jest src/Redux/Actions/__tests__/UserActions.merchantSignup.test.js
 */

const fs = require("fs");
const path = require("path");

describe("signUpMerchantWithStore Action", () => {
  const actionContent = fs.readFileSync(
    path.join(__dirname, "../UserActions.js"),
    "utf8",
  );
  const merchantSection = actionContent.match(
    /export const signUpMerchantWithStore[\s\S]*?^};/m,
  )?.[0];

  it("exists as a thunk", () => {
    expect(merchantSection).toBeTruthy();
  });

  describe("Ordering", () => {
    it("geocodes the address before creating the Auth user", () => {
      const geocodeAt = merchantSection.indexOf("geocodeStoreAddress(");
      const createAt = merchantSection.indexOf(
        "createUserWithEmailAndPassword(",
      );
      expect(geocodeAt).toBeGreaterThan(-1);
      expect(createAt).toBeGreaterThan(-1);
      expect(geocodeAt).toBeLessThan(createAt);
    });

    it("geocodes with the detected country and no Paris fallback", () => {
      expect(merchantSection).toContain(
        'const countryId = store.detectedCountryCode || "FR"',
      );
      expect(actionContent).toMatch(/region=\$\{countryId\.toLowerCase\(\)\}/);
      expect(actionContent).not.toContain("48.8566");
      expect(actionContent).toContain('errorWithCode("address_not_found"');
    });

    it("retries an email-already-in-use as a resumed signup", () => {
      expect(merchantSection).toMatch(
        /auth\/email-already-in-use[\s\S]*?signInWithEmailAndPassword\(/,
      );
    });
  });

  describe("Users Document", () => {
    it("is created pending with the merchant profile fields", () => {
      expect(merchantSection).toContain(
        "merchantStatus: MERCHANT_STATUS.PENDING",
      );
      expect(merchantSection).toContain(
        'companyNumber: store.companyNumber || ""',
      );
      expect(merchantSection).toContain("name: store.managerFirstName || null");
      expect(merchantSection).toContain(
        "surname: store.managerLastName || null",
      );
      expect(merchantSection).toContain('phone: store.phone || ""');
    });
  });

  describe("Store Document", () => {
    it("builds the address through buildStoreAddress with the country", () => {
      expect(merchantSection).toMatch(
        /address: buildStoreAddress\(\{[\s\S]*?countryId,[\s\S]*?\}\)/,
      );
    });

    it("writes the pre-approval defaults", () => {
      expect(merchantSection).toMatch(/^\s+category: \[\],$/m);
      expect(merchantSection).toMatch(/^\s+openingHours: \{\},$/m);
      expect(merchantSection).toMatch(/^\s+images: \[\],$/m);
      expect(merchantSection).toMatch(/^\s+imageUrl: "",$/m);
      expect(merchantSection).toMatch(/^\s+status: "pending",$/m);
      expect(merchantSection).toMatch(/^\s+is_validated: true,$/m);
    });

    it("never carries the guest's category filter into the store", () => {
      expect(merchantSection).not.toContain("store.selectedCategories");
    });

    it("keeps the store doc ref and syncs the city", () => {
      expect(merchantSection).toContain("storeDocRef = await addDoc(");
      expect(merchantSection).toMatch(
        /ensureCityExists\([\s\S]*?countryId,[\s\S]*?\)/,
      );
    });
  });

  describe("Notifications", () => {
    it("sends the admin the request details", () => {
      expect(merchantSection).toMatch(
        /sendAdminNotification\(safeEmail, username, USER_TYPES\.OWNER, \{[\s\S]*?companyNumber[\s\S]*?storeName[\s\S]*?\}\)/,
      );
    });
  });

  describe("Success", () => {
    it("dispatches AUTH_SUCCESS with merchantStatus so the gate applies now", () => {
      const successAt = merchantSection.indexOf('type: "AUTH_SUCCESS"');
      const payload = merchantSection.slice(successAt);
      expect(payload).toMatch(/merchantStatus:[\s\S]{0,400}?MERCHANT_STATUS\.PENDING/);
      expect(payload).toContain("...profile");
    });
  });

  describe("Rollback", () => {
    const catchSection = merchantSection.slice(
      merchantSection.indexOf("} catch (error) {"),
    );

    it("deletes store doc, then users doc, then the Auth user", () => {
      const storeAt = catchSection.indexOf("deleteDoc(storeDocRef)");
      const userAt = catchSection.indexOf('deleteDoc(doc(firestore, "users"');
      const authAt = catchSection.indexOf("auth.currentUser.delete()");
      expect(storeAt).toBeGreaterThan(-1);
      expect(userAt).toBeGreaterThan(storeAt);
      expect(authAt).toBeGreaterThan(userAt);
    });

    it("signs out when the Auth user cannot be deleted", () => {
      expect(catchSection).toMatch(
        /auth\.currentUser\.delete\(\)[\s\S]*?firebaseSignOut\(auth\)/,
      );
    });

    it("clears isSigningUp only after the rollback", () => {
      const flagAt = catchSection.indexOf("isSigningUp = false");
      const authAt = catchSection.indexOf("auth.currentUser.delete()");
      expect(flagAt).toBeGreaterThan(authAt);
    });
  });
});

describe("refreshCurrentUser", () => {
  const actionContent = fs.readFileSync(
    path.join(__dirname, "../UserActions.js"),
    "utf8",
  );

  it("is exported and never throws", () => {
    const section = actionContent.match(
      /export const refreshCurrentUser[\s\S]*?^};/m,
    )?.[0];
    expect(section).toBeTruthy();
    expect(section).toContain("fetchUserData(uid)(dispatch)");
    expect(section).toMatch(/catch \(error\)[\s\S]*?return false/);
  });
});
