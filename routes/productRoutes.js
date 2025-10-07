import express from 'express';
import { processPayment, getKey, paymentVerification,paymentWebhook,processPayment,getPaymentStatus} from '../controller/productController.js';    
const router = express.Router();

router.route('/payment/process').post(processPayment);
router.route('/getKey').get(getKey);
router.route('/paymentVerification').post(paymentVerification);
router.route("/payment/webhook").post(paymentWebhook);
router.route("/payment/process").post(processPayment);
router.route("/payment-status").get(getPaymentStatus);

export default router;