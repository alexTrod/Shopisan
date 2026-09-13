/**
 * Account types.
 *
 * Internal keys are "user" / "owner"; the labels shown to people are
 * "Shopper" / "Store Owner" and come from the translation files
 * (user_type_shopper / user_type_owner). Never hardcode either.
 *
 * Legacy documents written before the migration hold "shopper" / "merchant".
 * Read them through normalizeUserType() so old accounts keep working until
 * scripts/migrate-user-types.js has run everywhere.
 */

export const USER_TYPES = {
  SHOPPER: "user",
  OWNER: "owner",
};

const LEGACY_USER_TYPES = {
  shopper: USER_TYPES.SHOPPER,
  merchant: USER_TYPES.OWNER,
};

/** Map a stored userType to its current key. Unknown values fall back to shopper. */
export const normalizeUserType = (userType) => {
  if (userType === USER_TYPES.SHOPPER || userType === USER_TYPES.OWNER) {
    return userType;
  }
  return LEGACY_USER_TYPES[userType] || USER_TYPES.SHOPPER;
};

/** True when the account is allowed to create stores and posts. */
export const isOwnerType = (user) =>
  normalizeUserType(user?.userType) === USER_TYPES.OWNER;

/**
 * True when this user owns the store. This is the real permission check —
 * it is what firestore.rules enforces. Account type controls whether the
 * create flows are reachable, ownership controls what you may edit.
 */
export const ownsStore = (user, ownerId) =>
  !!user?.id && !!ownerId && user.id === ownerId;

/** i18n key for the account type's display label. */
export const userTypeLabelKey = (userType) =>
  normalizeUserType(userType) === USER_TYPES.OWNER
    ? "user_type_owner"
    : "user_type_shopper";

/**
 * Merchant pre-approval state, stored on users/{uid}.merchantStatus and
 * owned by the server (admin panel writes it; firestore.rules freezes it
 * for self-updates). Only store owners carry it: shoppers never do, and
 * owners created before the pre-approval flow have no field at all —
 * both read as "approved" so nothing existing is locked out.
 */
export const MERCHANT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const getMerchantStatus = (user) => {
  if (!isOwnerType(user)) return MERCHANT_STATUS.APPROVED;
  const status = user?.merchantStatus;
  return status === MERCHANT_STATUS.PENDING ||
    status === MERCHANT_STATUS.REJECTED
    ? status
    : MERCHANT_STATUS.APPROVED;
};

export const isMerchantApproved = (user) =>
  getMerchantStatus(user) === MERCHANT_STATUS.APPROVED;
export const isMerchantPending = (user) =>
  getMerchantStatus(user) === MERCHANT_STATUS.PENDING;
export const isMerchantRejected = (user) =>
  getMerchantStatus(user) === MERCHANT_STATUS.REJECTED;
