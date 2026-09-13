/**
 * toDetailItem Tests
 *
 * The detail sheet is opened from the home list, the map markers and the map
 * floating cards. Each used to build its own payload, and the map ones dropped
 * the store photos. These tests pin the normalized shape.
 *
 * Run with: npx jest src/components/item-card/__tests__/toDetailItem.test.js
 */

import toDetailItem from "../toDetailItem";

const storeDoc = {
  id: "store-1",
  name: "sdsdsdsd",
  description: { fr: "Bonjour", en: "Hello" },
  category: ["cat-1", "cat-2"],
  address: [{ location: { city: { name: "Mountain View" } } }],
  openingHours: { monday: [] },
  images: ["https://cdn.com/1.jpg", "https://cdn.com/2.jpg"],
  imageUrl: "https://cdn.com/cover.jpg",
  owner_id: "user-1",
  phone: "+32 2 123 45 67",
  email: "shop@example.com",
  website: "example.com",
  is_verified: true,
  cityName: "Palo Alto",
};

const categoryNames = { "cat-1": "Menswear", "cat-2": "Shoes" };
const getCategoryName = (id) => categoryNames[id];

describe("toDetailItem", () => {
  it("keeps the store photos a raw Firestore doc carries", () => {
    const item = toDetailItem(storeDoc);

    expect(item.images).toEqual([
      "https://cdn.com/1.jpg",
      "https://cdn.com/2.jpg",
    ]);
    expect(item.imageUrl).toBe("https://cdn.com/cover.jpg");
  });

  it("keeps owner_id so owners still see the add-post action", () => {
    expect(toDetailItem(storeDoc).owner_id).toBe("user-1");
  });

  it("resolves category ids to names when a lookup is provided", () => {
    expect(toDetailItem(storeDoc, { getCategoryName }).tags).toEqual([
      "Menswear",
      "Shoes",
    ]);
  });

  it("leaves already-named tags untouched", () => {
    const item = toDetailItem(
      { ...storeDoc, tags: ["Menswear"] },
      { getCategoryName },
    );

    expect(item.tags).toEqual(["Menswear"]);
  });

  it("picks the description for the active locale", () => {
    expect(toDetailItem(storeDoc, { locale: "en" }).description).toBe("Hello");
    expect(toDetailItem(storeDoc, { locale: "fr" }).description).toBe(
      "Bonjour",
    );
  });

  it("falls back to another locale when the active one is missing", () => {
    const item = toDetailItem(
      { ...storeDoc, description: { en: "Hello" } },
      { locale: "fr" },
    );

    expect(item.description).toBe("Hello");
  });

  it("accepts the flattened props an ItemCard holds", () => {
    const item = toDetailItem({
      id: "store-1",
      title: "sdsdsdsd",
      description: "Plain string",
      tags: ["Menswear"],
      address: [],
      images: ["https://cdn.com/1.jpg"],
    });

    expect(item).toMatchObject({
      id: "store-1",
      title: "sdsdsdsd",
      description: "Plain string",
      tags: ["Menswear"],
      images: ["https://cdn.com/1.jpg"],
    });
  });

  it("normalizes missing fields instead of throwing", () => {
    const item = toDetailItem({ id: "store-1" });

    expect(item).toEqual({
      id: "store-1",
      title: "",
      description: "",
      tags: [],
      address: [],
      openingHours: null,
      images: [],
      imageUrl: null,
      owner_id: null,
      phone: "",
      email: "",
      website: "",
      is_verified: false,
      cityName: "",
    });
  });

  describe("contact details and trust signal", () => {
    it("carries phone, email and website so the sheet can render contact rows", () => {
      expect(toDetailItem(storeDoc)).toMatchObject({
        phone: "+32 2 123 45 67",
        email: "shop@example.com",
        website: "example.com",
      });
    });

    it("carries is_verified for the badge next to the title", () => {
      expect(toDetailItem(storeDoc).is_verified).toBe(true);
    });

    it("projects a missing is_verified as false, not undefined", () => {
      expect(toDetailItem({ id: "store-1" }).is_verified).toBe(false);
    });

    it("keeps a pre-approval store's empty contact fields as empty strings", () => {
      // The reduced signup wizard writes no phone/email; the sheet must be
      // able to hide those rows without null checks.
      const item = toDetailItem({ ...storeDoc, phone: null, email: undefined });

      expect(item.phone).toBe("");
      expect(item.email).toBe("");
    });

    it("prefers the top-level cityName over the address city", () => {
      expect(toDetailItem(storeDoc).cityName).toBe("Palo Alto");
    });

    it("falls back to the address city when cityName is missing", () => {
      const { cityName: _dropped, ...withoutCityName } = storeDoc;

      expect(toDetailItem(withoutCityName).cityName).toBe("Mountain View");
    });
  });

  it("drops a non-array address so the sheet renders the empty state", () => {
    expect(
      toDetailItem({ id: "store-1", address: "No address available" }).address,
    ).toEqual([]);
  });

  it("returns null for a missing store", () => {
    expect(toDetailItem(null)).toBeNull();
  });
});
