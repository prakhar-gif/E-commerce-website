import { Router } from "express";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { requireAuth } from "../middleware/auth.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

const router = Router();

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { items, shipping } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty." });
    }
    const required = ["fullName", "address", "city", "postalCode", "phone"];
    if (!shipping || required.some(k => !String(shipping[k] || "").trim())) {
      return res.status(400).json({ message: "Please complete all shipping fields." });
    }

    // Never trust product prices sent by the browser; load current prices from MongoDB.
    const normalizedItems = [];
    let total = 0;
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ message: "Invalid item quantity." });
      }
      const product = await Product.findById(item.productId);
      if (!product || product.stock < quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product?.name || "a product"}.` });
      }
      normalizedItems.push({
        product: product._id, name: product.name, price: product.price, quantity
      });
      total += product.price * quantity;
    }

    const order = await Order.create({
      user: req.userId, items: normalizedItems, shipping,
      total: Math.round(total * 100) / 100, status: "payment_pending"
    });

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(201).json({
        demo: true, orderId: order.id, amount: order.total,
        message: "Order saved in demo mode. No payment was taken."
      });
    }

    const paymentOrder = await razorpay.orders.create({
      amount: Math.round(order.total * 100),
      currency: "INR",
      receipt: order.id
    });
    order.razorpayOrderId = paymentOrder.id;
    await order.save();

    res.status(201).json({
      demo: false, orderId: order.id, amount: paymentOrder.amount,
      currency: paymentOrder.currency, razorpayOrderId: paymentOrder.id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) { next(err); }
});

router.post("/:id/verify-payment", requireAuth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: "Payment order mismatch." });
    }
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const received = Buffer.from(String(razorpay_signature || ""));
    const expectedBuffer = Buffer.from(expected);
    if (received.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(received, expectedBuffer)) {
      return res.status(400).json({ message: "Payment signature verification failed." });
    }

    order.razorpayPaymentId = razorpay_payment_id;
    order.status = "paid";
    await order.save();
    res.json({ message: "Payment verified.", orderId: order.id, status: order.status });
  } catch (err) { next(err); }
});

router.get("/mine/list", requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 }).limit(50);
    res.json({ orders });
  } catch (err) { next(err); }
});

export default router;
