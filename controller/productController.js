import { instance } from '../server.js';
import Payment from '../models/payment.js';
import crypto from 'crypto';
import { connectDB } from "../server.js";
import { waitForPaymentCapture } from '../services/paymentRetry.js';




export const processPayment = async (req, res) => {
  await connectDB();
  const options = {
    amount: Number(req.body.amount * 100),
    currency: "INR",
  };
  const order = await instance.orders.create(options);

  
  await Payment.create({
    order_id: order.id,
    amount: req.body.amount,
    status: "PENDING",
  });

  res.status(200).json({ success: true, order });
};


export const getKey = async (req, res) => {
    res.status(200).json({

        key: process.env.RAZORPAY_API_KEY
    })
}


export const paymentVerification = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    //  Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    //  Connect to DB
    await connectDB();

    //  Create a PENDING record only if it doesn't exist (upsert)
    await Payment.updateOne(
      { payment_id: razorpay_payment_id },
      {
        $setOnInsert: { //If payment record does not exist → a new record is created with status: PENDING
          order_id: razorpay_order_id,
          status: "INPROGRESS", // only set if record does not exist
        },
      },
      { upsert: true }
    );

    //  Respond to frontend immediately
    res.status(200).json({ success: true, message: "Payment signature verified" });

  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const paymentWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const digest = crypto.createHmac("sha256", secret)
                       .update(JSON.stringify(req.body))
                       .digest("hex");

  if (digest !== req.headers["x-razorpay-signature"]) {
    return res.status(400).json({ status: "invalid signature" });
  }

  await connectDB();

  const { event } = req.body;
  if (event === "payment.captured") {
    const payment = req.body.payload.payment.entity;
    await Payment.updateOne(
      { payment_id: payment.id },
      {
        $set: {
          order_id: payment.order_id,
          amount: payment.amount / 100,
          status: payment.status,
          currency: payment.currency,
          email: payment.email,
          contact: payment.contact,
        },
      },
      { upsert: true }
    );
  }

  res.status(200).json({ status: "ok" });
};


export const getPaymentStatus = async (req, res) => {
  try {
    const { payment_id } = req.body;

    if (!payment_id) {
      return res.status(400).json({ success: false, message: "Payment ID is required" });
    }

    // Wait for capture with retry mechanism
    try {
      const status = await waitForPaymentCapture(payment_id);
      return res.status(200).json({ success: true, status });
    } catch (errStatus) {
      // If timeout or failed
      return res.status(200).json({ success: false, status: errStatus });
    }

  } catch (err) {
    console.error("Error fetching payment status:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};