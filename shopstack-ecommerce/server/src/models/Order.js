import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
  }],
  shipping: {
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    phone: { type: String, required: true }
  },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["payment_pending", "paid", "cancelled"], default: "payment_pending" },
  paymentProvider: { type: String, default: "razorpay" },
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
