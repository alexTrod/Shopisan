/**
 * userTypes Tests
 *
 * Merchant pre-approval state lives on users/{uid}.merchantStatus. Shoppers
 * never carry it and owners created before the flow existed have no field,
 * so "missing" must read as approved or existing accounts get locked out.
 *
 * Run with: npx jest src/utils/__tests__/userTypes.test.js
 */

import {
  MERCHANT_STATUS,
  USER_TYPES,
  getMerchantStatus,
  isMerchantApproved,
  isMerchantPending,
  isMerchantRejected,
} from "../userTypes";

describe("getMerchantStatus", () => {
  it("reads pending and rejected off an owner", () => {
    expect(
      getMerchantStatus({
        userType: USER_TYPES.OWNER,
        merchantStatus: "pending",
      }),
    ).toBe(MERCHANT_STATUS.PENDING);
    expect(
      getMerchantStatus({
        userType: USER_TYPES.OWNER,
        merchantStatus: "rejected",
      }),
    ).toBe(MERCHANT_STATUS.REJECTED);
  });

  it("treats a legacy owner without the field as approved", () => {
    expect(getMerchantStatus({ userType: USER_TYPES.OWNER })).toBe(
      MERCHANT_STATUS.APPROVED,
    );
    expect(getMerchantStatus({ userType: "merchant" })).toBe(
      MERCHANT_STATUS.APPROVED,
    );
  });

  it("treats an unknown value as approved", () => {
    expect(
      getMerchantStatus({
        userType: USER_TYPES.OWNER,
        merchantStatus: "weird",
      }),
    ).toBe(MERCHANT_STATUS.APPROVED);
  });

  it("never gates shoppers, even with a stray pending field", () => {
    expect(
      getMerchantStatus({
        userType: USER_TYPES.SHOPPER,
        merchantStatus: "pending",
      }),
    ).toBe(MERCHANT_STATUS.APPROVED);
    expect(getMerchantStatus(null)).toBe(MERCHANT_STATUS.APPROVED);
    expect(getMerchantStatus(undefined)).toBe(MERCHANT_STATUS.APPROVED);
  });
});

describe("isMerchantApproved / isMerchantPending / isMerchantRejected", () => {
  const pending = { userType: USER_TYPES.OWNER, merchantStatus: "pending" };
  const rejected = { userType: USER_TYPES.OWNER, merchantStatus: "rejected" };
  const approved = { userType: USER_TYPES.OWNER, merchantStatus: "approved" };

  it("are mutually exclusive", () => {
    expect(isMerchantPending(pending)).toBe(true);
    expect(isMerchantApproved(pending)).toBe(false);
    expect(isMerchantRejected(pending)).toBe(false);

    expect(isMerchantRejected(rejected)).toBe(true);
    expect(isMerchantApproved(rejected)).toBe(false);

    expect(isMerchantApproved(approved)).toBe(true);
    expect(isMerchantPending(approved)).toBe(false);
  });

  it("lets shoppers and legacy owners through", () => {
    expect(isMerchantApproved({ userType: USER_TYPES.SHOPPER })).toBe(true);
    expect(isMerchantApproved({ userType: USER_TYPES.OWNER })).toBe(true);
  });
});
