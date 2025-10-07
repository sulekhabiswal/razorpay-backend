// services/paymentRetry.js
import Payment from "../models/payment.js"; // Adjust path as needed
import { connectDB } from "../server.js"; // Adjust path as needed

/**
 * Wait for the payment to be captured in DB
 * @param {string} payment_id - Razorpay payment ID
 * @param {number} interval - Retry interval in ms
 * @param {number} maxAttempts - Max retries
 * @returns {Promise<string>} - Resolves with status or rejects on failure
 */
export const waitForPaymentCapture = async (
  order_id,
  interval = 2000,
  maxAttempts = 5
) => {
  await connectDB();

  let attempts = 0;

  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      attempts++;

      try {
        const payment = await Payment.findOne({ order_id });
  // Log current attempt and status
        console.log(`Retry attempt ${attempts} for order_id ${order_id}:`, payment?.status || "not found");
        if (!payment) {
          clearInterval(timer);
          return reject({ status: "not_found", attempts });
        }

        switch (payment.status) {
          case "captured":
            clearInterval(timer);
            return resolve({ status: "captured", attempts });

          case "INPROGRESS":
            if (attempts >= maxAttempts) {
              clearInterval(timer);
              return reject({ status: "timeout", attempts });
            }
            // else continue retrying
            break;

          case "failed":
          case "refunded":
            clearInterval(timer);
            return reject({ status: payment.status, attempts });

          default:
            if (attempts >= maxAttempts) {
              clearInterval(timer);
              return reject({ status: payment.status || "unknown", attempts });
            }
            // continue retrying
        }
      } catch (err) {
        clearInterval(timer);
        return reject({ status: "error", error: err, attempts });
      }
    }, interval);
  });
};
