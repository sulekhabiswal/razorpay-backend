import { instance } from '../server.js';
import Payment from '../models/payment.js';
import crypto from 'crypto';
import { connectDB } from "../server.js";




export const processPayment = async (req, res) => {

    const options = {
        amount: Number(req.body.amount * 100),
        currency: "INR",
    }

    const order = await instance.orders.create(options);
    res.status(200).json({
        success: true,
        order
    })
}

export const getKey = async (req, res) => {
    res.status(200).json({

        key: process.env.RAZORPAY_API_KEY
    })
}


export const paymentVerification = async (req, res) => {
    console.log(req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const val = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_API_SECRET)
        .update(val.toString())
        .digest('hex');
    // console.log(`razorpay Signature: ${razorpay_signature}`);
    // console.log(`Expected Signature: ${expectedSignature}`);
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
        return res.redirect(`http://localhost:5173/paymentsuccess?reference=${razorpay_payment_id}`);
        res.status(200).json({
            success: true,
        })
    } else {
        res.status(400).json({
            success: false,
        })
    }
    // res.status(200).json({
    //     success: true,
    // })

}


export const paymentWebhook = async (req, res) => {
    console.log("Webhook received:", req.body);

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== req.headers["x-razorpay-signature"]) {
        return res.status(400).json({ status: "invalid signature" });
    }

    try {
        // Ensure DB is connected
        await connectDB();

        const event = req.body.event;
        if (event === "payment.captured") {
            const payment = req.body.payload.payment.entity;

            // Save payment to MongoDB
            await Payment.create({
                payment_id: payment.id,
                order_id: payment.order_id,
                amount: payment.amount / 100, // convert paise to INR
                currency: payment.currency,
                status: payment.status,
                email: payment.email,
                contact: payment.contact,
            });

            console.log("Payment saved:", payment.id);
        }

        res.status(200).json({ status: "ok" });
    } catch (err) {
        console.error("Error in webhook:", err);
        res.status(500).json({ status: "error", message: err.message });
    }
};
