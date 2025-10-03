import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  payment_id: String,
  order_id: String,
  amount: Number,
  currency: String,
  status: String,
  email: String,
  contact: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Payment", PaymentSchema);
