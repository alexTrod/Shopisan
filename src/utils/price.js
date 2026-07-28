/**
 * Post price formatting.
 *
 * Sellers choose a currency per post, so display must follow the post's own
 * currency rather than assuming euros. Posts created before the currency
 * picker have no currency field and are euro by definition.
 */

const DEFAULT_SYMBOL = "€";

/**
 * Format a post price for display.
 *
 * Returns null when there is no price, so callers can skip the row. A price
 * of 0 is a real value ("free") and must not be treated as absent.
 *
 * @param {number|string|null|undefined} price
 * @param {Object} [currency] - { code, symbol }
 * @returns {string|null}
 */
export const formatPostPrice = (price, currency) => {
  if (price === null || price === undefined || price === "") {
    return null;
  }
  return `${price} ${currency?.symbol || DEFAULT_SYMBOL}`;
};
