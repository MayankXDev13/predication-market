import { Router } from "express";
import { prisma } from "db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/positions", authMiddleware, async (req, res) => {
  try {
    const userId: string = req.userId;
    const positions = await prisma.position.findMany({ where: { userId } });
    res.json({ positions });
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ message: "Error fetching positions" });
  }
});

export default router;
