import type { Orderbook } from "../types";
import type { MatchResult, MatchEvent } from "./types";
import { parseOrderbook, pruneOrderbook, sortedPrices } from "./orderbook";

/**
 * Execute a buy order against an orderbook.
 * Matches against existing sell orders at or below the buy price.
 * Unmatched quantity becomes a reverse sell order on the opposite book.
 */
export function matchBuy(
  side: "yes" | "no",
  price: number,
  qty: number,
  rawYesOrderbook: unknown,
  rawNoOrderbook: unknown
): MatchResult {
  const yesOrderbook = parseOrderbook(rawYesOrderbook);
  const noOrderbook = parseOrderbook(rawNoOrderbook);
  const matches: MatchEvent[] = [];
  let leftQty = qty;

  // The orderbook we match against depends on the side we're buying
  const targetBook = side === "yes" ? yesOrderbook : noOrderbook;
  const prices = sortedPrices(targetBook);

  for (const bookPrice of prices) {
    if (bookPrice > price) continue; // only match at or below our price
    const { orders } = targetBook[bookPrice]!;

    for (const order of orders) {
      if (leftQty <= 0) break;

      const matchedQty = Math.min(order.qty - order.filledQty, leftQty);

      matches.push({
        makerUserId: order.userId,
        qty: matchedQty,
        price: bookPrice,
        isReverseOrder: order.reverseOrder,
        side: side === "yes" ? "yes" : "no",
      });

      order.filledQty += matchedQty;
      targetBook[bookPrice]!.availableQty -= matchedQty;
      leftQty -= matchedQty;
    }
  }

  // Residual: unmatched quantity becomes a reverse order on the opposite book
  let residual: MatchResult["residual"];
  if (leftQty > 0) {
    const oppositePrice = 100 - price;
    const oppositeBook = side === "yes" ? noOrderbook : yesOrderbook;

    if (!oppositeBook[oppositePrice]) {
      oppositeBook[oppositePrice] = { availableQty: 0, orders: [] };
    }
    oppositeBook[oppositePrice]!.availableQty += leftQty;
    oppositeBook[oppositePrice]!.orders.push({
      qty: leftQty,
      userId: "", // filled in by caller
      filledQty: 0,
      originalOrderId: "", // filled in by caller
      reverseOrder: true,
    });

    residual = {
      side: side === "yes" ? "no" : "yes",
      price: oppositePrice,
      qty: leftQty,
      isReverseOrder: true,
    };
  }

  return {
    matchedQty: qty - leftQty,
    leftQty,
    yesOrderbook: pruneOrderbook(yesOrderbook),
    noOrderbook: pruneOrderbook(noOrderbook),
    matches,
    residual,
  };
}

/**
 * Execute a sell order against an orderbook.
 * Selling YES = buying NO (price is inverted: 100 - sellPrice).
 * Matches against the opposite orderbook.
 */
export function matchSell(
  side: "yes" | "no",
  price: number,
  qty: number,
  rawYesOrderbook: unknown,
  rawNoOrderbook: unknown
): MatchResult {
  const yesOrderbook = parseOrderbook(rawYesOrderbook);
  const noOrderbook = parseOrderbook(rawNoOrderbook);
  const matches: MatchEvent[] = [];
  let leftQty = qty;

  // Selling YES matches against the NO orderbook (at inverted price)
  // Selling NO matches against the YES orderbook
  const buyPrice = 100 - price;
  const targetBook = side === "yes" ? noOrderbook : yesOrderbook;
  const prices = sortedPrices(targetBook);

  for (const bookPrice of prices) {
    if (bookPrice > buyPrice) continue;
    const { orders } = targetBook[bookPrice]!;

    for (const order of orders) {
      if (leftQty <= 0) break;

      const matchedQty = Math.min(order.qty - order.filledQty, leftQty);

      matches.push({
        makerUserId: order.userId,
        qty: matchedQty,
        price: bookPrice,
        isReverseOrder: order.reverseOrder,
        side: side === "yes" ? "no" : "yes",
      });

      order.filledQty += matchedQty;
      targetBook[bookPrice]!.availableQty -= matchedQty;
      leftQty -= matchedQty;
    }
  }

  // Residual: unmatched sell becomes a direct sell order on the same side's orderbook
  let residual: MatchResult["residual"];
  if (leftQty > 0) {
    const originalBook = side === "yes" ? yesOrderbook : noOrderbook;

    if (!originalBook[price]) {
      originalBook[price] = { availableQty: 0, orders: [] };
    }
    originalBook[price]!.availableQty += leftQty;
    originalBook[price]!.orders.push({
      qty: leftQty,
      userId: "", // filled in by caller
      filledQty: 0,
      originalOrderId: "", // filled in by caller
      reverseOrder: false,
    });

    residual = {
      side,
      price,
      qty: leftQty,
      isReverseOrder: false,
    };
  }

  return {
    matchedQty: qty - leftQty,
    leftQty,
    yesOrderbook: pruneOrderbook(yesOrderbook),
    noOrderbook: pruneOrderbook(noOrderbook),
    matches,
    residual,
  };
}

export type { MatchResult } from "./types";
