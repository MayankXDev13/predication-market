import { z } from "zod";

// ---- Enums ----

export enum MarketStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  RESOLVED = "RESOLVED",
}

export enum OutcomeType {
  YES = "YES",
  NO = "NO",
}

export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  SETTLEMENT = "SETTLEMENT",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
}

// ---- Zod Schemas ----

export const CreateOrderSchema = z.object({
  marketId: z.string(),
  qty: z.number().int().min(1).max(1_000_000),
  price: z.number().int().min(1).max(99),
  type: z.enum(["buy", "sell"]),
  side: z.enum(["yes", "no"]),
});

export const SplitSchema = z.object({
  marketId: z.string(),
  amount: z.number().int().min(1).max(1_000_000),
});

export const OnrampSchema = z.object({
  amount: z.number().positive(),
});

export const OfframpSchema = z.object({
  amount: z.number().positive(),
});

export const ResolveSchema = z.object({
  marketId: z.string(),
  outcome: z.enum(["YES", "NO"]),
});

export const WithdrawSchema = z.object({
  amount: z.number().int().positive(),
  destinationAddress: z.string().min(32).max(44),
});

// ---- Types ----

export type Orderbook = {
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
};

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type SplitInput = z.infer<typeof SplitSchema>;
export type ResolveInput = z.infer<typeof ResolveSchema>;
export type WithdrawInput = z.infer<typeof WithdrawSchema>;
