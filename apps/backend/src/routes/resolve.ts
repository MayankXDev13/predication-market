import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "db";
import { resolveMarket, MarketError } from "../services/marketService";
import { ResolveSchema } from "../types";
import { config } from "../config";

const router = Router();

// POST /resolve — Resolve a market (admin-only)
router.post("/resolve", authMiddleware, async (req, res) => {
  const { success, data } = ResolveSchema.safeParse(req.body);
  const userId: string = req.userId;

  if (!success) {
    res.status(411).json({ message: "Incorrect inputs" });
    return;
  }

  // Check admin rights by wallet address
  try {
    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user || !config.adminAddresses.includes(user.address)) {
      res.status(403).json({ message: "Not authorized to resolve markets" });
      return;
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Error checking authorization" });
    return;
  }

  try {
    await resolveMarket(data.marketId, data.outcome, userId);
    res.json({ message: "Market resolved successfully", outcome: data.outcome });
  } catch (error: any) {
    console.error("Error resolving market:", error);
    if (error instanceof MarketError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error resolving market" });
    }
  }
});

export default router;
