/**
 * formatPostPrice Tests
 *
 * Run with: npx jest src/utils/__tests__/price.test.js
 */

import { formatPostPrice } from "../price";

describe("formatPostPrice", () => {
  it("should use the currency symbol from the post", () => {
    expect(formatPostPrice(20, { code: "GBP", symbol: "£" })).toBe("20 £");
  });

  it("should handle multi-character symbols", () => {
    expect(formatPostPrice(35, { code: "CHF", symbol: "CHF" })).toBe("35 CHF");
  });

  it("should fall back to euro when the post has no currency", () => {
    // Posts predating the currency picker are euro by definition.
    expect(formatPostPrice(20)).toBe("20 €");
    expect(formatPostPrice(20, null)).toBe("20 €");
  });

  it("should fall back to euro when the currency has no symbol", () => {
    expect(formatPostPrice(20, { code: "EUR" })).toBe("20 €");
  });

  it("should format a free post rather than hiding it", () => {
    // A truthiness check would drop this entirely.
    expect(formatPostPrice(0, { code: "EUR", symbol: "€" })).toBe("0 €");
  });

  it("should return null when there is no price", () => {
    expect(formatPostPrice(null)).toBeNull();
    expect(formatPostPrice(undefined)).toBeNull();
    expect(formatPostPrice("")).toBeNull();
  });

  it("should accept a price stored as a string", () => {
    // PostForm submits the price as a trimmed string.
    expect(formatPostPrice("29.99", { code: "EUR", symbol: "€" })).toBe(
      "29.99 €",
    );
  });
});
