import { ownsStore } from "./userTypes";

/**
 * Store moderation visibility.
 *
 * stores/{id}.status is 'pending' from creation until an admin approves it.
 * Pending, trashed (deleted_at) and suspended stores are hidden from
 * shoppers everywhere (list, map, search, favorites, deep links). The store
 * list fetch already drops trashed/suspended ones, but cached lists and
 * single-document reads (favorites, deep links) do not go through it.
 * Stores created before the status field existed have no status and stay
 * visible — missing means approved.
 *
 * Owners always see their own store (Profile > Edit my store, My stores),
 * so those readers must NOT use these filters; use them only on
 * shopper-facing paths.
 */
export const isStoreVisibleToShopper = (store) =>
  !!store &&
  store.status !== "pending" &&
  !store.deleted_at &&
  !store.is_suspended;

// Owners keep seeing their own pending or suspended store (it carries an
// owner-only badge), but never a trashed one.
export const isStoreVisibleTo = (store, user) =>
  isStoreVisibleToShopper(store) ||
  (ownsStore(user, store?.owner_id) && !store?.deleted_at);
