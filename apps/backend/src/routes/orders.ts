import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { placeOrder, OrderError } from "../services/orderService";
import { CreateOrderSchema } from "../types";

const router = Router();

// POST /order — Place a buy/sell order
router.post("/order", authMiddleware, async (req, res) => {
  const { success, data } = CreateOrderSchema.safeParse(req.body);
  const userId: string = req.userId;

  if (!success) {
    res.status(411).json({ message: "Incorrect inputs" });
    return;
  }

  try {
    await placeOrder(userId, data);
    res.json({ message: "Order executed successfully" });
  } catch (error: any) {
    console.error("Error executing order:", error);
    if (error instanceof OrderError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error executing order" });
    }
  }
});

export default router;
