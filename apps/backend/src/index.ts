import dotenv from "dotenv";
dotenv.config();
import http from "http";
import express from "express";
import cors from "cors";
import { config } from "./config";
import { WsManager } from "./services/wsManager";
import { setWsManager } from "./app";
import marketsRouter from "./routes/markets";
import ordersRouter from "./routes/orders";
import splitmergeRouter from "./routes/splitmerge";
import balanceRouter from "./routes/balance";
import positionsRouter from "./routes/positions";
import historyRouter from "./routes/history";
import resolveRouter from "./routes/resolve";
import usdcRouter from "./routes/usdc";

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
