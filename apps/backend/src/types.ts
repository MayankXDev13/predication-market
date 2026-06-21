import { z } from "zod";

export const createOrderSchema = z.object({
  marketId: z.string(),
  qty: z.int(), // 10 => 10 qty
  price: z.int(), // 10 => 0.010 $
  type: z.enum(["buy", "sell", "split", "merge"]),
  side: z.enum(["yes", "no"]),
});


export type Orderbook = {
  [key: string] : {
    availableQty: number,
    orders: {userId: string, qty: number, filledQty: number, originalOrderId: string, reverseOrder: boolean}[]
  }
}

export type CreateOrderSchema = z.infer<typeof createOrderSchema>;