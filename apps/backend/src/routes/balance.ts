import { Router } from "express";
import { prisma } from "db";
import { authMiddleware } from "../middleware/auth";
import { OnrampSchema, OfframpSchema } from "../types";

const router = Router();

// GET /balance — Get user's USD and USDC balance
router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const userId: string = req.userId;
    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ balance: user.usdBalance, usdcBalance: user.usdcBalance });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ message: "Error fetching balance" });
  }
});

// POST /onramp — Deposit USD (simulated until USDC integration in Phase 6)
router.post("/onramp", authMiddleware, async (req, res) => {
  const { success, data } = OnrampSchema.safeParse(req.body);
  const userId: string = req.userId;

  if (!success) {
    res.status(411).json({ message: "Incorrect inputs" });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const userRows = await tx.$queryRaw<
        { id: string; usdBalance: number }[]
      >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

      const user = userRows[0];
      if (!user) throw new Error("User not found");

      const amountInCents = Math.round(data.amount * 100);
      await tx.user.update({
        where: { id: userId },
        data: { usdBalance: { increment: amountInCents } },
      });
    });

    res.json({ message: "Onramp successful", amount: data.amount });
  } catch (error: any) {
    console.error("Error processing onramp:", error);
    res.status(500).json({ message: "Error processing onramp" });
  }
});

// POST /offramp — Withdraw USD (simulated until USDC integration in Phase 6)
router.post("/offramp", authMiddleware, async (req, res) => {
  const { success, data } = OfframpSchema.safeParse(req.body);
  const userId: string = req.userId;

  if (!success) {
    res.status(411).json({ message: "Incorrect inputs" });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const userRows = await tx.$queryRaw<
        { id: string; usdBalance: number }[]
      >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

      const user = userRows[0];
      if (!user) throw new Error("User not found");

      const amountInCents = Math.round(data.amount * 100);

      if (user.usdBalance < amountInCents) {
        throw new Error("Insufficient USD balance");
      }

      await tx.user.update({
        where: { id: userId },
        data: { usdBalance: { decrement: amountInCents } },
      });
    });

    res.json({ message: "Offramp successful", amount: data.amount });
  } catch (error: any) {
    console.error("Error processing offramp:", error);
    if (error.message === "Insufficient USD balance") {
      res.status(403).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error processing offramp" });
    }
  }
});

export default router;
