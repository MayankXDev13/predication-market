-- AddMarketResolutionAndUsdc
-- Migration: Add market resolution, USDC balance, transactions, and OrderHistory timestamps

-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('OPEN', 'CLOSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "OutcomeType" AS ENUM ('YES', 'NO');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "usdcBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "usdcDepositMemo" TEXT;
CREATE UNIQUE INDEX "User_usdcDepositMemo_key" ON "User"("usdcDepositMemo");

-- AlterTable: Market
ALTER TABLE "Market" ADD COLUMN "status" "MarketStatus" NOT NULL DEFAULT 'OPEN';
ALTER TABLE "Market" ADD COLUMN "resolvedOutcome" "OutcomeType";
ALTER TABLE "Market" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Market" ADD COLUMN "resolvedBy" TEXT;

-- AlterTable: OrderHistory
ALTER TABLE "OrderHistory" ADD COLUMN "side" TEXT;
ALTER TABLE "OrderHistory" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: Transaction
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "signature" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
