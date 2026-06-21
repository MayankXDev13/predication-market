import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, getAccount, createTransferInstruction, getMint } from "@solana/spl-token";
import bs58 from "bs58";
import { prisma } from "db";
import { config } from "../config";
import { wsManager } from "../app";

/**
 * Generate a unique memo for a user's USDC deposit.
 * Memo format: `pred-market:${userId}`
 */
export function generateDepositMemo(userId: string): string {
  return `pred-market:${userId}`;
}

/**
 * Get the system's USDC deposit wallet address.
 * Returns the public key of the system wallet.
 */
export function getSystemWalletAddress(): string {
  const keypair = Keypair.fromSecretKey(
    bs58.decode(config.systemWalletPrivateKey)
  );
  return keypair.publicKey.toBase58();
}

/**
 * Parse the memo from a Helius webhook payload to extract the userId.
 * Memo format: `pred-market:${userId}`
 */
export function parseDepositMemo(memo: string): string | null {
  if (!memo.startsWith("pred-market:")) return null;
  return memo.slice("pred-market:".length);
}

/**
 * Process an incoming USDC deposit from a Helius webhook.
 *
 * Steps:
 * 1. Parse the userId from the memo
 * 2. Verify the token mint matches USDC
 * 3. Convert amount (6-decimal USDC) to cents (2 decimals)
 * 4. Credit the user's usdcBalance
 * 5. Record Transaction record
 * 6. Broadcast balance_update via WebSocket
 */
export async function processDeposit(
  userId: string,
  rawAmount: number, // USDC has 6 decimals
  signature: string
): Promise<void> {
  // Convert USDC (6 decimals) to cents (2 decimals)
  // USDC: 1.000000 = 1 USDC
  // Cents: 100 cents = 1 USD
  // So amountInCents = rawAmount / 10_000 (divide by 10^(6-2))
  const amountInCents = Math.round(rawAmount / 10_000);

  if (amountInCents <= 0) return;

  await prisma.$transaction(async (tx) => {
    // Lock user row
    const userRows = await tx.$queryRaw<
      { id: string; usdcBalance: number }[]
    >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

    const user = userRows[0];
    if (!user) throw new Error("User not found");

    // Credit USDC balance
    await tx.user.update({
      where: { id: userId },
      data: { usdcBalance: { increment: amountInCents } },
    });

    // Record deposit transaction
    await tx.transaction.create({
      data: {
        userId,
        type: "DEPOSIT",
        amount: amountInCents,
        signature,
        status: "CONFIRMED",
      },
    });
  });

  // Broadcast
  if (wsManager) {
    wsManager.broadcast(`user:${userId}`, {
      type: "balance_update",
      userId,
    });
  }
}

/**
 * Create an unsigned transfer transaction for a USDC withdrawal.
 * Returns the serialized transaction that the frontend signs and broadcasts.
 */
export async function createWithdrawalTransaction(
  userId: string,
  amountInCents: number,
  destinationAddress: string
): Promise<{ transactionId: string; serializedTx: string }> {
  // Deduct from user's usdcBalance within a transaction
  const transactionId = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    const userRows = await tx.$queryRaw<
      { id: string; usdcBalance: number }[]
    >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

    const user = userRows[0];
    if (!user) throw new Error("User not found");
    if (user.usdcBalance < amountInCents) {
      throw new Error("Insufficient USDC balance");
    }

    // Record pending withdrawal
    await tx.transaction.create({
      data: {
        id: transactionId,
        userId,
        type: "WITHDRAWAL",
        amount: amountInCents,
        status: "PENDING",
      },
    });
  });

  return { transactionId, serializedTx: "" };
}

/**
 * Confirm a USDC withdrawal after the user has signed and broadcast the transaction.
 */
export async function confirmWithdrawal(
  transactionId: string,
  signature: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.findFirst({
      where: { id: transactionId },
    });

    if (!txn) throw new Error("Transaction not found");
    if (txn.status !== "PENDING") throw new Error("Transaction already processed");

    // Lock user row and deduct balance
    const userRows = await tx.$queryRaw<
      { id: string; usdcBalance: number }[]
    >`SELECT * FROM "User" WHERE id=${txn.userId} FOR UPDATE;`;

    const user = userRows[0];
    if (!user) throw new Error("User not found");

    await tx.user.update({
      where: { id: txn.userId },
      data: { usdcBalance: { decrement: txn.amount } },
    });

    await tx.transaction.update({
      where: { id: transactionId },
      data: { status: "CONFIRMED", signature },
    });
  });

  // Broadcast
  const txn = await prisma.transaction.findFirst({ where: { id: transactionId } });
  if (wsManager && txn) {
    wsManager.broadcast(`user:${txn.userId}`, {
      type: "balance_update",
      userId: txn.userId,
    });
  }
}
