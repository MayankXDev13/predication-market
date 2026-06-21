import type { Orderbook } from "../types";

export interface MatchResult {
  /** Quantity that was matched/filled */
  matchedQty: number;
  /** Quantity that was NOT matched (becomes a new order) */
  leftQty: number;
  /** The updated orderbook after matching + any residual order placement */
  yesOrderbook: Orderbook;
  noOrderbook: Orderbook;
  /** Details of each match event for DB bookkeeping */
  matches: MatchEvent[];
  /** If a residual order was created */
  residual?: {
    side: "yes" | "no";
    price: number;
    qty: number;
    isReverseOrder: boolean;
  };
}

export interface MatchEvent {
  /** The user whose order was matched against */
  makerUserId: string;
  /** Quantity matched in this event */
  qty: number;
  /** Price at which the match occurred */
  price: number;
  /** Whether the matched order is a reverse order */
  isReverseOrder: boolean;
  /** Which side the matched order was on */
  side: "yes" | "no";
}
