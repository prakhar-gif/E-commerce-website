import { Router } from "express";
import Product from "../models/Product.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { search = "", category = "", minPrice, maxPrice, sort = "newest" } = req.query;
    const filter = {};
    if (search.trim()) filter.$or = [
      { name: { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      { description: { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
    ];
    if (category && category !== "All") filter.category = category;
    if (minPrice !== undefined && minPrice !== "") filter.price = { ...filter.price, $gte: Number(minPrice) };
    if (maxPrice !== undefined && maxPrice !== "") filter.price = { ...filter.price, $lte: Number(maxPrice) };
    const sortMap = { priceAsc: { price: 1 }, priceDesc: { price: -1 }, name: { name: 1 }, newest: { createdAt: -1 } };
    const products = await Product.find(filter).sort(sortMap[sort] || sortMap.newest).limit(100);
    res.json({ products });
  } catch (err) { next(err); }
});

router.get("/categories", async (_req, res, next) => {
  try { res.json({ categories: await Product.distinct("category") }); }
  catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ product });
  } catch (err) { next(err); }
});

export default router;
