/**
 * deleteAccount Action Tests
 *
 * Tests the Redux action for deleting user accounts.
 * Uses static analysis approach since Jest doesn't support dynamic imports well.
 *
 * Run with: npx jest src/Redux/Actions/__tests__/UserActions.deleteAccount.test.js
 */

const fs = require("fs");
const path = require("path");

describe("deleteAccount Action", () => {
  const actionContent = fs.readFileSync(
    path.join(__dirname, "../UserActions.js"),
    "utf8",
  );

  describe("Cloud Function Call", () => {
    it("should call deleteUser cloud function", () => {
      const hasCloudFunctionCall = actionContent.includes(
        'httpsCallable(functions, "deleteUser")',
      );
      expect(hasCloudFunctionCall).toBe(true);
    });

    it("should pass userId and email to cloud function", () => {
      const hasCorrectParams = actionContent.includes(
        "deleteUserFn({ userId, email })",
      );
      expect(hasCorrectParams).toBe(true);
    });
  });

  describe("Local Sign Out", () => {
    it("should call firebaseSignOut after successful deletion", () => {
      // Check that deleteAccount function calls firebaseSignOut
      const deleteAccountMatch = actionContent.match(
        /export const deleteAccount[\s\S]*?await firebaseSignOut\(auth\)/,
      );
      expect(deleteAccountMatch).toBeTruthy();
    });
  });

  describe("Redux Dispatch", () => {
    it("should dispatch AUTH_LOGOUT after successful deletion", () => {
      // Check that deleteAccount dispatches AUTH_LOGOUT
      const deleteAccountMatch = actionContent.match(
        /export const deleteAccount[\s\S]*?dispatch\(\{ type: ["']AUTH_LOGOUT["'] \}\)/,
      );
      expect(deleteAccountMatch).toBeTruthy();
    });
  });

  describe("Return Value", () => {
    it("should return success object", () => {
      const deleteAccountMatch = actionContent.match(
        /export const deleteAccount[\s\S]*?return \{ success: true \}/,
      );
      expect(deleteAccountMatch).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    it("should log errors with logError", () => {
      const hasErrorLogging = actionContent.includes(
        'logError("Delete account failed"',
      );
      expect(hasErrorLogging).toBe(true);
    });

    it("should re-throw errors", () => {
      // Check that errors are thrown after logging
      const deleteAccountSection = actionContent.match(
        /export const deleteAccount[\s\S]*?throw error;[\s\S]*?};/,
      );
      expect(deleteAccountSection).toBeTruthy();
    });
  });

  describe("Function Signature", () => {
    it("should accept userId and email parameters", () => {
      const hasCorrectSignature = actionContent.includes(
        "deleteAccount = (userId, email)",
      );
      expect(hasCorrectSignature).toBe(true);
    });

    it("should be a thunk (returns async function taking dispatch)", () => {
      const isThunk = actionContent.includes(
        "deleteAccount = (userId, email) => async (dispatch)",
      );
      expect(isThunk).toBe(true);
    });
  });
});
