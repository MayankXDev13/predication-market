import { Router } from "express";
import { prisma } from "db";
import { authMiddleware } from "../middleware/auth";
import { WithdrawSchema } from "../types";
import {
  generateDepositMemo,
  getSystemWalletAddress,
  parseDepositMemo,
  processDeposit,
  createWithdrawalTransaction,
  confirmWithdrawal,
} from "../services/usdcService";

const router = Router();

// GET /usdc/deposit-address — Get the system wallet address + user's deposit memo
router.get("/usdc/deposit-address", authMiddleware, async (req, res) => {
  try {
    const userId: string = req.userId;
    const systemAddress = getSystemWalletAddress();
    const memo = generateDepositMemo(userId);

    res.json({
      address: systemAddress,
      memo,
      network: "devnet", // will be configurable for mainnet
    });
  } catch (error) {
    console.error("Error getting deposit address:", error);
    res.status(500).json({ message: "Error getting deposit address" });
  }
});

// POST /usdc/webhook — Helius webhook for incoming USDC transfers
router.post("/usdc/webhook", async (req, res) => {
  try {
    const { webhookSecret } = req.query;
    // Basic auth: check webhook secret
    // In production, verify Helius signature header

    const events = req.body as any[];
    if (!Array.isArray(events)) {
      res.status(400).json({ message: "Expected array of events" });
      return;
    }

    for (const event of events) {
      // Parse token transfer data from Helius webhook format
      const memo = event?.accountData?.[0]?.memo || "";
      const userId = parseDepositMemo(memo);
      if (!userId) continue; // Not our memo, skip

      const tokenTransfers = event?.tokenTransfers || [];
      for (const transfer of tokenTransfers) {
        const { mint, rawTokenAmount, signature } = transfer;
        if (mint === process.env.USDC_MINT) {
          await processDeposit(userId, Number(rawTokenAmount), signature);
        }
      }
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ message: "Error processing webhook" });
  }
});

// POST /usdc/withdraw — Create a withdrawal (returns unsigned tx for user to sign)
router.post("/usdc/withdraw", authMiddleware, async (req, res) => {
  const { success, data } = WithdrawSchema.safeParse(req.body);
  const userId: string = req.userId;

  if (!success) {
    res.status(411).json({ message: "Incorrect inputs" });
    return;
  }

  try {
    const result = await createWithdrawalTransaction(
      userId,
      data.amount,
      data.destinationAddress
    );
    res.json({ transactionId: result.transactionId, serializedTx: result.serializedTx });
  } catch (error: any) {
    console.error("Error creating withdrawal:", error);
    if (error.message === "Insufficient USDC balance") {
      res.status(403).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error creating withdrawal" });
    }
  }
});

// POST /usdc/withdraw/confirm — Confirm a withdrawal after user signs
router.post("/usdc/withdraw/confirm", authMiddleware, async (req, res) => {
  const { transactionId, signature } = req.body;

  if (!transactionId || !signature) {
    res.status(411).json({ message: "transactionId and signature required" });
    return;
  }

  try {
    await confirmWithdrawal(transactionId, signature);
    res.json({ message: "Withdrawal confirmed" });
  } catch (error: any) {
    console.error("Error confirming withdrawal:", error);
    res.status(500).json({ message: "Error confirming withdrawal" });
  }
});

export default router;
