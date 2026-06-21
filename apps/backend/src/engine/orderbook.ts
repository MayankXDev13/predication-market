import type { Orderbook } from "../types";

/**
 * Parse an orderbook value from the database (JSON string or object) into a typed Orderbook.
 */
export function parseOrderbook(value: unknown): Orderbook {
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  if (value && typeof value === "object") {
    return value as Orderbook;
  }
  return {};
}

/**
 * Remove empty price levels and fully-filled orders from an orderbook.
 * Keeps the orderbook lean and prevents accumulation of stale entries.
 */
export function pruneOrderbook(ob: Orderbook): Orderbook {
  const cleaned: Orderbook = {};
  for (const [price, level] of Object.entries(ob)) {
    const activeOrders = level.orders.filter((o) => o.filledQty < o.qty);
    if (activeOrders.length > 0) {
      cleaned[price] = { availableQty: level.availableQty, orders: activeOrders };
    }
  }
  return cleaned;
}

/**
 * Sort orderbook price keys ascending (lowest price first).
 */
export function sortedPrices(ob: Orderbook): number[] {
  return Object.keys(ob)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

/**
 * Get the best (lowest) ask price from an orderbook.
 */
export function bestAsk(ob: Orderbook): number | null {
  const prices = sortedPrices(ob);
  return prices.length > 0 ? prices[0] : null;
}

/**
 * Get the best (highest) bid price from an orderbook.
 * Bids are derived from the opposite orderbook (100 - ask).
 */
export function bestBid(ob: Orderbook): number | null {
  const asks = sortedPrices(ob);
  if (asks.length === 0) return null;
  return Math.max(...asks.map((p) => 100 - p));
}
