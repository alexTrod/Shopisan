import { ownsStore } from "./userTypes";

/**
 * Store moderation visibility.
 *
 * stores/{id}.status is 'pending' from creation until an admin approves it.
 * Pending stores are hidden from shoppers everywhere (list, map, search,
 * favorites, deep links). Stores created before the field existed have no
 * status and stay visible — missing means approved.
 *
 * Owners always see their own store (Profile > Edit my store, My stores),
 * so those readers must NOT use these filters; use them only on
 * shopper-facing paths.
 */
export const isStoreVisibleToShopper = (store) => store?.status !== "pending";

export const isStoreVisibleTo = (store, user) =>
  isStoreVisibleToShopper(store) || ownsStore(user, store?.owner_id);
