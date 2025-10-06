// server.js
import app from "./app.js";
import Razorpay from "razorpay";
import mongoose from "mongoose";
import serverless from "serverless-http";

// Load .env only in local dev
if (!process.env.VERCEL) {
  const dotenv = await import("dotenv");
  dotenv.config({ path: "./config/config.env" });
}

// Razorpay instance (OK at module scope)
export const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET
});

// Share Mongo connection across invocations
let mongoConn;
async function connectDB() {
  if (mongoConn) return mongoConn;
  mongoConn = await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB Connected");
  return mongoConn;
}

// Ensure DB before routes
app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (e) { console.error("MongoDB connection error:", e); res.status(500).json({ error: "db" }); }
});



//  Export the serverless handler
export default app;
export const handler = serverless(app);
