import express from 'express';
import { processPayment, getKey, paymentVerification,paymentWebhook,getPaymentStatus} from '../controller/productController.js';    
const router = express.Router();

router.route('/payment/process').post(processPayment);
router.route('/getKey').get(getKey);
router.route('/paymentVerification').post(paymentVerification);
router.route("/payment/webhook").post(paymentWebhook);
router.route("/payment/process").post(processPayment);
router.route("/payment-status").post(getPaymentStatus);

export default router;