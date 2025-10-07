import { instance } from '../server.js';
import Payment from '../models/payment.js';
import crypto from 'crypto';
import { connectDB } from "../server.js";
import { waitForPaymentCapture } from '../services/paymentRetry.js';




export const processPayment = async (req, res) => {
  try {
    await connectDB();

    const options = {
      amount: Number(req.body.amount * 100), // amount in paisa
      currency: "INR",
    };

    // Create Razorpay order
    const order = await instance.orders.create(options);

    // Check if a record for this order_id already exists (webhook came first)
    const existingPayment = await Payment.findOne({ order_id: order.id });

    if (existingPayment) {
      // If record exists, just update amount and ensure status is correct if needed
      await Payment.updateOne(
        { order_id: order.id },
        {
          $set: {
            amount: req.body.amount,
            status: existingPayment.status || "PENDING", // keep existing status if captured
            payment_id: existingPayment.payment_id || null,
          },
        }
      );
    } else {
      // If no record exists, create a new one
      await Payment.create({
        order_id: order.id,
        amount: req.body.amount,
        status: "PENDING",
        payment_id: null, // initially null
      });
    }

    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error("ProcessPayment error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



export const getKey = async (req, res) => {
    res.status(200).json({

        key: process.env.RAZORPAY_API_KEY
    })
}


export const paymentVerification = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature to ensure frontend data is not tampered
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Connect to DB
    await connectDB();

    // Find payment record by order_id
    const payment = await Payment.findOne({ order_id: razorpay_order_id });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    // If webhook has NOT fired yet (payment_id is null), update status to INPROGRESS
    if (!payment.payment_id) {
      await Payment.updateOne(
        { order_id: razorpay_order_id },
        {
          $set: {
            payment_id: razorpay_payment_id,
            status: "INPROGRESS",
          },
        }
      );
    }
    // If webhook already fired (payment_id exists), do NOT overwrite status

    //  Respond to frontend
    res.status(200).json({ success: true, message: "Payment signature verified" });

  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const paymentWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const digest = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (digest !== req.headers["x-razorpay-signature"]) {
      return res.status(400).json({ status: "invalid signature" });
    }

    await connectDB();

    const { event } = req.body;
    if (event === "payment.captured") {
      const payment = req.body.payload.payment.entity;

      // Try to find existing record by order_id
      const existingPayment = await Payment.findOne({ order_id: payment.order_id });

      if (existingPayment) {
        // Record exists, update payment_id and status
        await Payment.updateOne(
          { order_id: payment.order_id },
          {
            $set: {
              payment_id: payment.id,
              status: payment.status, // captured
              amount: payment.amount / 100,
              currency: payment.currency,
              email: payment.email,
              contact: payment.contact,
            },
          }
        );
      } else {
        // Record does not exist (webhook came first) → create a new one
        await Payment.create({
          order_id: payment.order_id,
          payment_id: payment.id,
          amount: payment.amount / 100,
          status: payment.status, // captured
          currency: payment.currency,
          email: payment.email,
          contact: payment.contact,
        });
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};



export const getPaymentStatus = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order ID is required" });
    }

    try {
      const result = await waitForPaymentCapture(razorpay_order_id);
      return res.status(200).json({ success: true, ...result });
    } catch (errStatus) {
      return res.status(200).json({ success: false, ...errStatus });
    }

  } catch (err) {
    console.error("Error fetching payment status:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

