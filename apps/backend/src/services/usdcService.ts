import {
  Keypair,
  PublicKey,
  Transaction,
  Connection,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from "@solana/spl-token";
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
 * Parse a Solana private key from either a base58 string or a JSON number array.
 *
 * Supports two formats:
 *   - Base58: the full 64-byte secret key encoded in base58 (~88 chars)
 *   - JSON array: "[34,156,72,...,221]" — the default output of `solana-keygen new`
 *
 * @throws with a descriptive message if the key is missing or not exactly 64 bytes.
 */
function parsePrivateKey(raw: string): Uint8Array {
  if (!raw) {
    throw new Error(
      "SYSTEM_WALLET_PRIVATE_KEY is not set. " +
        "Set it in .env to the base58 or JSON-array secret key of your system wallet."
    );
  }

  let decoded: Uint8Array;

  // JSON array — the default output of `solana-keygen new`
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error("Expected a JSON array");
      }
      decoded = Uint8Array.from(parsed);
    } catch (e) {
      throw new Error(
        `Failed to parse SYSTEM_WALLET_PRIVATE_KEY as a JSON array: ${e}`
      );
    }
  } else {
    // Base58 encoded secret key
    try {
      decoded = bs58.decode(raw);
    } catch (e) {
      throw new Error(
        `Failed to decode SYSTEM_WALLET_PRIVATE_KEY as base58: ${e}`
      );
    }
  }

  if (decoded.length !== 64) {
    throw new Error(
      `Invalid SYSTEM_WALLET_PRIVATE_KEY: got ${decoded.length} bytes, expected 64. ` +
        "Make sure this is the full 64-byte secret key (secret + public), not a 32-byte seed. " +
        "Generate a new keypair with: solana-keygen new --no-bip39-passphrase --force --outfile /dev/stdout | head -1"
    );
  }

  return decoded;
}

/**
 * Get the system's USDC deposit wallet address.
 * Returns the public key of the system wallet.
 */
export function getSystemWalletAddress(): string {
  const secretKey = parsePrivateKey(config.systemWalletPrivateKey);
  const keypair = Keypair.fromSecretKey(secretKey);
  return keypair.publicKey.toBase58();
}

// Exported for startup validation
export { parsePrivateKey };

/**
 * Create a Solana RPC connection using the configured URL.
 */
function getConnection(): Connection {
  return new Connection(config.solanaRpcUrl, "confirmed");
}

/**
 * Get the system wallet Keypair from the configured private key.
 */
function getSystemWallet(): Keypair {
  return Keypair.fromSecretKey(parsePrivateKey(config.systemWalletPrivateKey));
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
 * Process a USDC withdrawal from the system wallet to the user's destination address.
 *
 * Steps:
 * 1. Lock the user row and check balance (FOR UPDATE)
 * 2. Build a Solana transfer tx from the system's USDC ATA to the user's wallet
 * 3. Sign and broadcast with the system keypair
 * 4. Record the transaction as CONFIRMED in the DB
 * 5. Decrement the user's usdcBalance
 * 6. Broadcast balance_update via WebSocket
 */
export async function createWithdrawalTransaction(
  userId: string,
  amountInCents: number,
  destinationAddress: string
): Promise<{ transactionId: string; signature: string }> {
  const connection = getConnection();
  const systemWallet = getSystemWallet();
  const destinationPubkey = new PublicKey(destinationAddress);
  const transactionId = crypto.randomUUID();

  // Convert cents back to USDC raw amount (6 decimals)
  const rawAmount = amountInCents * 10_000;

  const signature = await prisma.$transaction(async (prismaTx) => {
    // Lock user row
    const userRows = await prismaTx.$queryRaw<
      { id: string; usdcBalance: number }[]
    >`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

    const user = userRows[0];
    if (!user) throw new Error("User not found");
    if (user.usdcBalance < amountInCents) {
      throw new Error("Insufficient USDC balance");
    }

    // Resolve ATAs: system (source) and user (destination)
    const mint = new PublicKey(config.usdcMint);

    // Check the system's USDC balance before building the tx
    const sourceAta = await getOrCreateAssociatedTokenAccount(
      connection,
      systemWallet,
      mint,
      systemWallet.publicKey,
    );

    const systemBalance = Number(sourceAta.amount);
    if (systemBalance < rawAmount) {
      throw new Error("Insufficient system USDC liquidity");
    }

    // Build the transfer instruction
    const destinationAta = await getOrCreateAssociatedTokenAccount(
      connection,
      systemWallet,
      mint,
      destinationPubkey,
    );

    const transferIx = createTransferInstruction(
      sourceAta.address,
      destinationAta.address,
      systemWallet.publicKey,
      BigInt(rawAmount),
    );

    // Build, sign, and broadcast the transaction
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const solTx = new Transaction().add(transferIx);
    solTx.recentBlockhash = blockhash;
    solTx.feePayer = systemWallet.publicKey;
    solTx.sign(systemWallet);

    const txSignature = await sendAndConfirmTransaction(connection, solTx, [
      systemWallet,
    ]);

    // Deduct from user's usdcBalance and record confirmed transaction
    await prismaTx.user.update({
      where: { id: userId },
      data: { usdcBalance: { decrement: amountInCents } },
    });

    await prismaTx.transaction.create({
      data: {
        id: transactionId,
        userId,
        type: "WITHDRAWAL",
        amount: amountInCents,
        signature: txSignature,
        status: "CONFIRMED",
      },
    });

    return txSignature;
  });

  // Broadcast
  if (wsManager) {
    wsManager.broadcast(`user:${userId}`, {
      type: "balance_update",
      userId,
    });
  }

  return { transactionId, signature };
}
