import { Router } from "express";
import { prisma } from "db";

const router = Router();

// List all markets
router.get("/markets", async (_req, res) => {
  try {
    const markets = await prisma.market.findMany();
    res.json({ markets });
  } catch (error) {
    console.error("Error fetching markets:", error);
    res.status(500).json({ message: "Error fetching markets" });
  }
});

// Get single market by query param: GET /market?marketId=xxx
router.get("/market", async (req, res) => {
  try {
    const market = await prisma.market.findFirst({
      where: { id: req.query.marketId as string },
    });
    if (!market) {
      res.status(404).json({ message: "Market not found" });
      return;
    }
    res.json({ market });
  } catch (error) {
    console.error("Error fetching market:", error);
    res.status(500).json({ message: "Error fetching market" });
  }
});

export default router;
