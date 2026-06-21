import "dotenv/config";
import express from "express";
import cors from "cors";
import { middleware } from "./middleware";
import { prisma } from "db";

const app = express();

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

app.post("/buy", middleware, (req, res) => {
  res.json({ message: "Success" });
});

app.post("/sell", middleware, (req, res) => {});

app.post("/split", middleware, (req, res) => {});

app.post("/merge", middleware, (req, res) => {});

app.post("/balance", middleware, (req, res) => {});

app.post("/positions", middleware, (req, res) => {});

app.post("/history", middleware, (req, res) => {});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
