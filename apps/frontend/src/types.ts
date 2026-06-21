export type MarketStatus = "OPEN" | "CLOSED" | "RESOLVED";
export type OutcomeType = "YES" | "NO";
export type PositionType = "Yes" | "No";
export type OrderType = "Buy" | "Sell" | "Split" | "Merge";
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "SETTLEMENT";
export type TransactionStatus = "PENDING" | "CONFIRMED" | "FAILED";

export interface Market {
  id: string;
  title: string;
  description: string;
  resolutionDescription: string;
  yesOrderbook: string | Orderbook;
  noOrderbook: string | Orderbook;
  totalQty: number;
  status: MarketStatus;
  resolvedOutcome?: OutcomeType | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

export interface Orderbook {
  [key: string]: {
    availableQty: number;
    orders: {
      userId: string;
      qty: number;
      filledQty: number;
      originalOrderId: string;
      reverseOrder: boolean;
    }[];
  };
}

export interface Position {
  id: string;
  userId: string;
  marketId: string;
  type: PositionType;
  qty: number;
}

export interface OrderHistory {
  id: string;
  orderType: OrderType;
  userId: string;
  price: number;
  qty: number;
  marketId: string;
  side?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  address: string;
  usdBalance: number;
  usdcBalance: number;
  usdcDepositMemo?: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  signature?: string | null;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}
