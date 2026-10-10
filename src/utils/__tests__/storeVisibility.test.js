/**
 * storeVisibility Tests
 *
 * Trashed and suspended stores used to rely on the store-list fetch to drop
 * them, so a cached list or a single-document read (favorites, deep links)
 * kept showing them to shoppers.
 */
import { isStoreVisibleToShopper, isStoreVisibleTo } from "../storeVisibility";

const OWNER = { id: "owner-1" };
const OTHER = { id: "someone-else" };

describe("isStoreVisibleToShopper", () => {
  it("shows approved and legacy (no status) stores", () => {
    expect(isStoreVisibleToShopper({ status: "approved" })).toBe(true);
    expect(isStoreVisibleToShopper({})).toBe(true);
  });

  it("hides pending, trashed and suspended stores", () => {
    expect(isStoreVisibleToShopper({ status: "pending" })).toBe(false);
    expect(
      isStoreVisibleToShopper({ status: "approved", deleted_at: 123 }),
    ).toBe(false);
    expect(
      isStoreVisibleToShopper({ status: "approved", is_suspended: true }),
    ).toBe(false);
  });

  it("hides a missing store", () => {
    expect(isStoreVisibleToShopper(null)).toBe(false);
  });
});

describe("isStoreVisibleTo", () => {
  it("lets the owner see their own pending or suspended store", () => {
    expect(
      isStoreVisibleTo({ status: "pending", owner_id: "owner-1" }, OWNER),
    ).toBe(true);
    expect(
      isStoreVisibleTo({ is_suspended: true, owner_id: "owner-1" }, OWNER),
    ).toBe(true);
  });

  it("never shows a trashed store, not even to its owner", () => {
    expect(
      isStoreVisibleTo({ deleted_at: 123, owner_id: "owner-1" }, OWNER),
    ).toBe(false);
  });

  it("hides another owner's pending store", () => {
    expect(
      isStoreVisibleTo({ status: "pending", owner_id: "owner-1" }, OTHER),
    ).toBe(false);
  });
});
