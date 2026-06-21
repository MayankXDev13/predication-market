import { prisma } from "db";
import { wsManager } from "../app";

export class MarketError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Resolve a market with a winning outcome.
 *
 * Steps:
 * 1. Verify market exists and is in resolvable state (OPEN or CLOSED)
 * 2. Set market to RESOLVED with the winning outcome
 * 3. Pay out winners: each winning share = 100¢ ($1.00)
 * 4. Zero out losing positions and clear the orderbook
 * 5. Record Settlement transactions for audit
 *
 * Idempotent: re-calling with same outcome is a no-op.
 */
export async function resolveMarket(
  marketId: string,
  outcome: "YES" | "NO",
  resolverUserId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Lock the market row
    const marketRows = await tx.$queryRaw<
      {
        id: string;
        status: string;
        resolvedOutcome: string | null;
        yesOrderbook: unknown;
        noOrderbook: unknown;
      }[]
    >`SELECT * FROM "Market" WHERE id=${marketId} FOR UPDATE;`;

    const market = marketRows[0];
    if (!market) throw new MarketError("Market not found", 404);

    // Idempotency check
    if (market.resolvedOutcome === outcome) {
      return; // already resolved with this outcome — no-op
    }
    if (market.resolvedOutcome && market.resolvedOutcome !== outcome) {
      throw new MarketError("Market is already resolved with a different outcome");
    }

    if (market.status !== "OPEN" && market.status !== "CLOSED") {
      throw new MarketError("Market is not in a resolvable state");
    }

    // Update market to resolved
    await tx.market.update({
      where: { id: marketId },
      data: {
        status: "RESOLVED",
        resolvedOutcome: outcome,
        resolvedAt: new Date(),
        resolvedBy: resolverUserId,
        yesOrderbook: JSON.stringify({}),
        noOrderbook: JSON.stringify({}),
      },
    });

    // Find all winning positions
    const positionType = outcome === "YES" ? "Yes" : "No";
    const winningPositions = await tx.position.findMany({
      where: { marketId, type: positionType as any, qty: { gt: 0 } },
    });

    // Pay out winners: each winning share = 100¢
    for (const position of winningPositions) {
      const payout = position.qty * 100; // 100¢ per share

      await tx.user.update({
        where: { id: position.userId },
        data: { usdBalance: { increment: payout } },
      });

      await tx.transaction.create({
        data: {
          userId: position.userId,
          type: "SETTLEMENT",
          amount: payout,
          status: "CONFIRMED",
        },
      });
    }

    // Zero out losing positions
    const losingType = outcome === "YES" ? "No" : "Yes";
    await tx.position.updateMany({
      where: { marketId, type: losingType as any },
      data: { qty: 0 },
    });

    // Also zero out winning positions (they've been paid out)
    await tx.position.updateMany({
      where: { marketId, type: positionType as any },
      data: { qty: 0 },
    });

    // Clean up all zero-quantity positions
    await tx.position.deleteMany({
      where: { marketId, qty: { lte: 0 } },
    });
  });

  // Broadcast resolution update
  if (wsManager) {
    wsManager.broadcast(`market:${marketId}`, {
      type: "market_update",
      marketId,
      status: "RESOLVED",
      outcome,
    });
  }
}
