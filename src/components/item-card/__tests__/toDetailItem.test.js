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
