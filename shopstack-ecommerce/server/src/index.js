import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error("MONGODB_URI and JWT_SECRET must be set in server/.env");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }), orderRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === 11000) return res.status(409).json({ message: "That email is already registered." });
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const port = process.env.PORT || 5000;
try {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`ShopStack API running at http://localhost:${port}`));
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  process.exit(1);
}
