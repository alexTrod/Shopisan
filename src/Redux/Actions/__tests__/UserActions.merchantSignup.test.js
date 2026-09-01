/**
 * signUpMerchantWithStore Action Tests
 *
 * Static-analysis tests (same approach as UserActions.deleteAccount.test.js)
 * for the merchant signup wizard's store creation.
 *
 * Regression guard: the wizard's StoreForm hands over `selectedImages`
 * (array), but the action used to read only `selectedImage` (singular), so
 * every photo added during merchant registration was silently dropped.
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

  describe("Image Upload", () => {
    it("uploads the selectedImages array from the store form", () => {
      expect(merchantSection).toContain("store.selectedImages");
      expect(merchantSection).toMatch(/for \(const img of imagesToUpload\)/);
    });

    it("keeps the legacy single selectedImage shape as a fallback", () => {
      expect(merchantSection).toContain("store.selectedImage");
      expect(merchantSection).toMatch(/\[store\.selectedImage\]/);
    });

    it("collects every uploaded variant URL", () => {
      expect(merchantSection).toMatch(
        /images\.push\(uploadData\.result\.variants\[0\]\)/,
      );
    });

    it("prefixes file:// on Android uris like the shared store form does", () => {
      expect(merchantSection).toMatch(
        /Platform\.OS === "android" && !img\.uri\.startsWith\("file:\/\/"\)/,
      );
    });

    it("continues signup when an upload fails", () => {
      expect(merchantSection).toMatch(
        /catch \(imgError\)[\s\S]*?continuing without image/,
      );
    });
  });

  describe("Store Document", () => {
    it("writes the full images array on the store doc", () => {
      expect(merchantSection).toMatch(/^\s+images,$/m);
    });

    it("writes imageUrl as the first uploaded image", () => {
      expect(merchantSection).toContain('imageUrl: images[0] || ""');
    });
  });
});
