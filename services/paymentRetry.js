// services/paymentRetry.js
import Payment from "../models/payment.js"; // Adjust path as needed
import connectDB from "../config/db.js";

/**
 * Wait for the payment to be captured in DB
 * @param {string} payment_id - Razorpay payment ID
 * @param {number} interval - Retry interval in ms
 * @param {number} maxAttempts - Max retries
 * @returns {Promise<string>} - Resolves with status or rejects on failure
 */
export const waitForPaymentCapture = async (payment_id, interval = 2000, maxAttempts = 10) => {
  await connectDB();

  let attempts = 0;

  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      attempts++;
      try {
        const payment = await Payment.findOne({ payment_id });

        if (!payment) {
          clearInterval(timer);
          return reject("Payment not found");
        }

        if (payment.status === "captured") {
          clearInterval(timer);
          return resolve("captured");
        } else if (payment.status === "failed" || payment.status === "refunded") {
          clearInterval(timer);
          return reject(payment.status);
        } else if (attempts >= maxAttempts) {
          clearInterval(timer);
          return reject("timeout");
        }
        // else: still pending/inprogress, continue retrying
      } catch (err) {
        clearInterval(timer);
        return reject(err);
      }
    }, interval);
  });
};
