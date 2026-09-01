/**
 * Legacy plaintext signup guard
 *
 * The old select-country / select-category signup flow wrote user documents
 * with PLAINTEXT passwords into the `DevelopmentUsers` collection and never
 * created a Firebase Auth account (so password reset could not work for
 * those users). The screens were removed; this test keeps them from coming
 * back.
 *
 * Run with: npx jest src/screens/auth/__tests__/noLegacyPlaintextSignup.test.js
 */

const fs = require("fs");
const path = require("path");

const SRC_ROOT = path.join(__dirname, "../../..");

const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
};

describe("Legacy plaintext signup flow", () => {
  it("select-country and select-category screens stay deleted", () => {
    expect(fs.existsSync(path.join(SRC_ROOT, "screens/auth/select-country"))).toBe(false);
    expect(fs.existsSync(path.join(SRC_ROOT, "screens/auth/select-category"))).toBe(false);
    expect(fs.existsSync(path.join(SRC_ROOT, "screens/auth/reset-password"))).toBe(false);
  });

  it("nothing in src/ touches the DevelopmentUsers collection", () => {
    const offenders = walk(SRC_ROOT)
      .filter((file) => !file.includes("__tests__"))
      .filter((file) => fs.readFileSync(file, "utf8").includes("DevelopmentUsers"))
      .map((file) => path.relative(SRC_ROOT, file));
    expect(offenders).toEqual([]);
  });

  it("nothing in src/ stores a password field in Firestore", () => {
    // setDoc/addDoc payloads must never carry a raw `password:` key.
    const offenders = walk(SRC_ROOT)
      .filter((file) => !file.includes("__tests__"))
      .filter((file) => {
        const content = fs.readFileSync(file, "utf8");
        return /(setDoc|addDoc)\([\s\S]{0,400}?password:\s*(?!null)/.test(content);
      })
      .map((file) => path.relative(SRC_ROOT, file));
    expect(offenders).toEqual([]);
  });
});
