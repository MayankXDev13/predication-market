import { v4 as uuidv4 } from "uuid";
import { prisma } from "db";
import { matchBuy, matchSell } from "../engine/matching";
import { wsManager } from "../app";
import type { CreateOrderInput } from "../types";

/**
 * Errors thrown by order processing that map to specific HTTP responses.
 */
export class OrderError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Place an order (buy/sell Yes/No) with full matching engine execution.
 *
 * Edge cases handled:
 *  - Market must be in OPEN status
 *  - Validates sufficient USD balance for buys
 *  - Validates sufficient position for sells
 *  - Cleans up zero-quantity positions after matching
 *  - Prunes empty orderbook levels before saving
 *  - Records side (yes/no) in OrderHistory
 *  - All operations within a single database transaction with FOR UPDATE locks
 */
export async function placeOrder(userId: string, input: CreateOrderInput): Promise<void> {
  const { marketId, side, type, price, qty } = input;
  const originalOrderId = uuidv4();

  await prisma.$transaction(async (tx) => {
    // Lock market and user rows
    const marketRows = await tx.$queryRaw<
      { id: string; status: string; yesOrderbook: unknown; noOrderbook: unknown; totalQty: number }[]
    >`SELECT * FROM "Market" WHERE id=${marketId} FOR UPDATE;`;

    const market = marketRows[0];
    if (!market) throw new OrderError("Market not found", 404);
    if (market.status !== "OPEN") throw new OrderError("Market is not open for trading");

    const userRows = await tx.$queryRaw<
      { id: string; usdBalance: number }[]
    >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

    const user = userRows[0];
    if (!user) throw new OrderError("User not found", 404);

    if (type === "buy") {
      const cost = qty * price;
      if (user.usdBalance < cost) {
        throw new OrderError("Insufficient USD balance");
      }
      const result = matchBuy(side, price, qty, market.yesOrderbook, market.noOrderbook);

      // Set userId and orderId on residual order (filled in by caller)
      if (result.residual) {
        const oppositeBook = side === "yes" ? result.noOrderbook : result.yesOrderbook;
        const residualOrders = oppositeBook[result.residual.price]?.orders;
        if (residualOrders && residualOrders.length > 0) {
          const lastOrder = residualOrders[residualOrders.length - 1];
          lastOrder.userId = userId;
          lastOrder.originalOrderId = originalOrderId;
        }
      }

      // Process matches: update maker positions and balances
      for (const match of result.matches) {
        if (match.isReverseOrder) {
          // Reverse order: increment the maker's OPPOSITE position
          const oppositeType = match.side === "yes" ? "No" : "Yes";
          await tx.position.upsert({
            where: {
              userId_marketId_type: {
                userId: match.makerUserId,
                marketId,
                type: oppositeType as any,
              },
            },
            update: { qty: { increment: match.qty } },
            create: { userId: match.makerUserId, marketId, type: oppositeType as any, qty: match.qty },
          });
          // Maker pays (100 - price) * qty for the opposite position
          await tx.user.update({
            where: { id: match.makerUserId },
            data: { usdBalance: { decrement: (100 - match.price) * match.qty } },
          });
        } else {
          // Direct order: decrement the maker's position
          const positionType = match.side === "yes" ? "Yes" : "No";
          await tx.position.update({
            where: {
              userId_marketId_type: {
                userId: match.makerUserId,
                marketId,
                type: positionType as any,
              },
            },
            data: { qty: { decrement: match.qty } },
          });
          // Maker gets paid at the matched price
          await tx.user.update({
            where: { id: match.makerUserId },
            data: { usdBalance: { increment: match.price * match.qty } },
          });
        }
      }

      // Update taker (buyer) position
      if (result.matchedQty > 0) {
        const positionType = side === "yes" ? "Yes" : "No";
        await tx.position.upsert({
          where: {
            userId_marketId_type: { userId, marketId, type: positionType as any },
          },
          update: { qty: { increment: result.matchedQty } },
          create: { userId, marketId, type: positionType as any, qty: result.matchedQty },
        });

        // Taker pays at the matched price (aggregated from all matches)
        const totalCost = result.matches.reduce((sum, m) => sum + m.price * m.qty, 0);
        await tx.user.update({
          where: { id: userId },
          data: { usdBalance: { decrement: totalCost } },
        });
      }

      // Clean up zero-quantity positions
      await tx.position.deleteMany({
        where: { qty: { lte: 0 } },
      });

      // Save updated orderbooks
      await tx.market.update({
        where: { id: marketId },
        data: {
          yesOrderbook: JSON.stringify(result.yesOrderbook),
          noOrderbook: JSON.stringify(result.noOrderbook),
        },
      });
    } else {
      // type === "sell": validate position exists
      const positionType = side === "yes" ? "Yes" : "No";
      const userPosition = await tx.position.findFirst({
        where: { userId, marketId, type: positionType as any },
      });
      if (!userPosition || userPosition.qty < qty) {
        throw new OrderError(`Insufficient ${positionType} position`);
      }

      const result = matchSell(side, price, qty, market.yesOrderbook, market.noOrderbook);

      // Set userId and orderId on residual order
      if (result.residual) {
        const originalBook = side === "yes" ? result.yesOrderbook : result.noOrderbook;
        const residualOrders = originalBook[result.residual.price]?.orders;
        if (residualOrders && residualOrders.length > 0) {
          const lastOrder = residualOrders[residualOrders.length - 1];
          lastOrder.userId = userId;
          lastOrder.originalOrderId = originalOrderId;
        }
      }

      // Process matches
      for (const match of result.matches) {
        if (match.isReverseOrder) {
          const oppositeType = match.side === "yes" ? "No" : "Yes";
          await tx.position.upsert({
            where: {
              userId_marketId_type: {
                userId: match.makerUserId,
                marketId,
                type: oppositeType as any,
              },
            },
            update: { qty: { increment: match.qty } },
            create: { userId: match.makerUserId, marketId, type: oppositeType as any, qty: match.qty },
          });
          await tx.user.update({
            where: { id: match.makerUserId },
            data: { usdBalance: { decrement: (100 - match.price) * match.qty } },
          });
        } else {
          const makerPositionType = match.side === "yes" ? "Yes" : "No";
          await tx.position.update({
            where: {
              userId_marketId_type: {
                userId: match.makerUserId,
                marketId,
                type: makerPositionType as any,
              },
            },
            data: { qty: { decrement: match.qty } },
          });
          await tx.user.update({
            where: { id: match.makerUserId },
            data: { usdBalance: { increment: match.price * match.qty } },
          });
        }
      }

      // Decrement taker (seller) position
      if (result.matchedQty > 0) {
        await tx.position.update({
          where: {
            userId_marketId_type: { userId, marketId, type: positionType as any },
          },
          data: { qty: { decrement: result.matchedQty } },
        });

        // Taker receives payment
        const totalRevenue = result.matches.reduce((sum, m) => sum + m.price * m.qty, 0);
        await tx.user.update({
          where: { id: userId },
          data: { usdBalance: { increment: totalRevenue } },
        });
      }

      // Clean up zero-quantity positions
      await tx.position.deleteMany({
        where: { qty: { lte: 0 } },
      });

      // Save updated orderbooks
      await tx.market.update({
        where: { id: marketId },
        data: {
          yesOrderbook: JSON.stringify(result.yesOrderbook),
          noOrderbook: JSON.stringify(result.noOrderbook),
        },
      });
    }

    // Record order history with side
    await tx.orderHistory.create({
      data: {
        id: originalOrderId,
        orderType: type === "buy" ? "Buy" : "Sell",
        userId,
        price,
        qty,
        side,
        marketId,
      },
    });
  });

  // Broadcast real-time updates
  if (wsManager) {
    wsManager.broadcast(`market:${marketId}`, {
      type: "orderbook_update",
      marketId,
      side,
      price,
      qty,
    });
    wsManager.broadcast(`user:${userId}`, {
      type: "position_update",
      userId,
    });
    wsManager.broadcast(`user:${userId}`, {
      type: "balance_update",
      userId,
    });
  }
}
