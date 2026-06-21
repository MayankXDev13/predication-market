import { Router } from "express";
import { prisma } from "db";
import { authMiddleware } from "../middleware/auth";
import { SplitSchema } from "../types";

const router = Router();

// POST /split — Split USD into equal Yes + No positions
router.post("/split", authMiddleware, async (req, res) => {
  const { data, success } = SplitSchema.safeParse(req.body);
  const userId: string = req.userId;

  if (!success) {
    res.status(411).json({ message: "Incorrect inputs" });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Lock both user AND market rows
      const marketRows = await tx.$queryRaw<
        { id: string; status: string }[]
      >`SELECT * FROM "Market" WHERE id=${data.marketId} FOR UPDATE;`;

      const market = marketRows[0];
      if (!market) throw new Error("Market not found");
      if (market.status !== "OPEN") throw new Error("Market is not open");

      const userRows = await tx.$queryRaw<
        { id: string; usdBalance: number }[]
      >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

      const user = userRows[0];
      if (!user) throw new Error("User not found");
      if (user.usdBalance < data.amount) throw new Error("Insufficient USD balance");

      // Decrement USD balance
      await tx.user.update({
        where: { id: userId },
        data: { usdBalance: { decrement: data.amount } },
      });

      // Upsert Yes position
      await tx.position.upsert({
        where: {
          userId_marketId_type: { marketId: data.marketId, userId, type: "Yes" },
        },
        create: { marketId: data.marketId, userId, type: "Yes", qty: data.amount },
        update: { qty: { increment: data.amount } },
      });

      // Upsert No position
      await tx.position.upsert({
        where: {
          userId_marketId_type: { marketId: data.marketId, userId, type: "No" },
        },
        create: { marketId: data.marketId, userId, type: "No", qty: data.amount },
        update: { qty: { increment: data.amount } },
      });

      // Record order history
      await tx.orderHistory.create({
        data: {
          orderType: "Split",
          userId,
          price: 0,
          qty: data.amount,
          marketId: data.marketId,
        },
      });
    });

    res.json({ message: "Split successful" });
  } catch (error: any) {
    console.error("Error splitting:", error);
    if (
      error.message === "Insufficient USD balance" ||
      error.message === "Market is not open"
    ) {
      res.status(403).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error splitting" });
    }
  }
});

// POST /merge — Merge equal Yes + No positions back into USD
router.post("/merge", authMiddleware, async (req, res) => {
  const { data, success } = SplitSchema.safeParse(req.body);
  const userId: string = req.userId;

  if (!success) {
    res.status(411).json({ message: "Incorrect inputs" });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Lock user + market rows
      const marketRows = await tx.$queryRaw<
        { id: string; status: string }[]
      >`SELECT * FROM "Market" WHERE id=${data.marketId} FOR UPDATE;`;

      const market = marketRows[0];
      if (!market) throw new Error("Market not found");
      if (market.status !== "OPEN") throw new Error("Market is not open for merge");

      const userRows = await tx.$queryRaw<
        { id: string; usdBalance: number }[]
      >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

      const user = userRows[0];
      if (!user) throw new Error("User not found");

      const yesPosition = await tx.position.findFirst({
        where: { userId, marketId: data.marketId, type: "Yes" },
      });

      const noPosition = await tx.position.findFirst({
        where: { userId, marketId: data.marketId, type: "No" },
      });

      if (!yesPosition || yesPosition.qty < data.amount) {
        throw new Error("Insufficient Yes position");
      }
      if (!noPosition || noPosition.qty < data.amount) {
        throw new Error("Insufficient No position");
      }

      await tx.position.update({
        where: {
          userId_marketId_type: { userId, marketId: data.marketId, type: "Yes" },
        },
        data: { qty: { decrement: data.amount } },
      });

      await tx.position.update({
        where: {
          userId_marketId_type: { userId, marketId: data.marketId, type: "No" },
        },
        data: { qty: { decrement: data.amount } },
      });

      // Clean up zero-quantity positions
      await tx.position.deleteMany({ where: { qty: { lte: 0 } } });

      await tx.user.update({
        where: { id: userId },
        data: { usdBalance: { increment: data.amount } },
      });

      await tx.orderHistory.create({
        data: {
          orderType: "Merge",
          userId,
          price: 0,
          qty: data.amount,
          marketId: data.marketId,
        },
      });
    });

    res.json({ message: "Merge successful" });
  } catch (error: any) {
    console.error("Error merging:", error);
    if (
      error.message === "Insufficient Yes position" ||
      error.message === "Insufficient No position" ||
      error.message === "Market is not open for merge"
    ) {
      res.status(403).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error merging" });
    }
  }
});

export default router;
