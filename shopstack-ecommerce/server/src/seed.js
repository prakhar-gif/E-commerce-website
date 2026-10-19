import "dotenv/config";
import mongoose from "mongoose";
import Product from "./models/Product.js";

const products = [
  { name: "Everyday Sneakers", description: "Comfortable sneakers for daily wear.", category: "Fashion", price: 2499, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800", stock: 20 },
  { name: "Wireless Headphones", description: "Wireless over-ear headphones for music and calls.", category: "Electronics", price: 3999, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800", stock: 15 },
  { name: "Minimal Wristwatch", description: "A clean, versatile watch design.", category: "Accessories", price: 1899, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800", stock: 12 },
  { name: "Travel Backpack", description: "A practical backpack for work and travel.", category: "Accessories", price: 1599, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800", stock: 18 },
  { name: "Desk Lamp", description: "A modern lamp for your desk or bedside.", category: "Home", price: 1299, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800", stock: 10 },
  { name: "Classic Sunglasses", description: "Everyday sunglasses with a timeless silhouette.", category: "Fashion", price: 999, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800", stock: 25 }
];

try {
  await mongoose.connect(process.env.MONGODB_URI);
  await Product.deleteMany({});
  await Product.insertMany(products.filter(p => !p.image.endsWith("photo-150与")));
  console.log("Demo products seeded.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
