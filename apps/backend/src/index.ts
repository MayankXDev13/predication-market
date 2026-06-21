import dotenv from "dotenv";
dotenv.config();
import http from "http";
import express from "express";
import cors from "cors";
import { Keypair } from "@solana/web3.js";
import { config } from "./config";
import { WsManager } from "./services/wsManager";
import { setWsManager } from "./app";
import { parsePrivateKey } from "./services/usdcService";
import marketsRouter from "./routes/markets";
import ordersRouter from "./routes/orders";
import splitmergeRouter from "./routes/splitmerge";
import balanceRouter from "./routes/balance";
import positionsRouter from "./routes/positions";
import historyRouter from "./routes/history";
import resolveRouter from "./routes/resolve";
import usdcRouter from "./routes/usdc";

// --- Startup validation ---

function validateConfig(): void {
  const errors: string[] = [];

  if (!config.supabaseUrl) errors.push("SUPABASE_URL is not set");
  if (!config.supabaseSecretKey) errors.push("SUPABASE_SECRET_KEY is not set");
  if (!config.databaseUrl) errors.push("DATABASE_URL is not set");

  // Validate the system wallet key immediately — fail fast instead of on first request
  if (!config.systemWalletPrivateKey) {
    errors.push(
      "SYSTEM_WALLET_PRIVATE_KEY is not set. " +
        "Set it in .env to the base58 or JSON-array secret key of your system wallet."
    );
  } else {
    try {
      const secretKey = parsePrivateKey(config.systemWalletPrivateKey);
      Keypair.fromSecretKey(secretKey);
      console.log("✓ System wallet configured");
    } catch (e) {
      errors.push(`SYSTEM_WALLET_PRIVATE_KEY is invalid: ${(e as Error).message}`);
    }
  }

  if (errors.length > 0) {
    console.error("\n✗ Startup configuration errors:");
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    console.error();
    process.exit(1);
  }
}

validateConfig();

// --- App ---

const app = express();

app.use(express.json());
app.use(cors());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use(marketsRouter);
app.use(ordersRouter);
app.use(splitmergeRouter);
app.use(balanceRouter);
app.use(positionsRouter);
app.use(historyRouter);
app.use(resolveRouter);
app.use(usdcRouter);

// Create HTTP server + WebSocket
const server = http.createServer(app);
const wsm = new WsManager(server);
setWsManager(wsm);

server.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
