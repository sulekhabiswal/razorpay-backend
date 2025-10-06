import express from 'express';
import { processPayment, getKey, paymentVerification} from '../controller/productController.js';    
const router = express.Router();

router.route('/payment/process').post(processPayment);
router.route('/getKey').get(getKey);
router.route('/paymentVerification').post(paymentVerification);
//router.route("/api/v1/payment/webhook").post(paymentWebhook);

export default router;