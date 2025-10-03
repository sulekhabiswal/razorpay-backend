import app from './app.js';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import mongoose from "mongoose";
dotenv.config({ path: './config/config.env' });


export const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET   
})

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB connection error:", err));
  

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});