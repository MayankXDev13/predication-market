import { Router } from "express";
import { prisma } from "db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/history", authMiddleware, async (req, res) => {
  try {
    const userId: string = req.userId;
    const history = await prisma.orderHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ history });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ message: "Error fetching history" });
  }
});

export default router;
