/**
 * Jest config for Firestore security rules tests.
 *
 * Separate from the app's jest-expo config: these run in Node against the
 * Firestore emulator, not in a React Native environment. Run them with
 * `npm run test:rules`, which boots the emulator first.
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/firestore-rules-tests/**/*.test.js"],
  testTimeout: 20000,
};
