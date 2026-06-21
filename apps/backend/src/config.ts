export const config = {
  port: Number(process.env.PORT) || 3000,
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || "",
  databaseUrl: process.env.DATABASE_URL || "",
  adminAddresses: (process.env.ADMIN_ADDRESSES || "").split(",").filter(Boolean),
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  usdcMint: process.env.USDC_MINT || "4zMMC9srt5Ri5X14GubXWn1MNEcSJWjKJn5T3KxTqW8P",
  systemWalletPrivateKey: process.env.SYSTEM_WALLET_PRIVATE_KEY || "",
  heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET || "",
};
