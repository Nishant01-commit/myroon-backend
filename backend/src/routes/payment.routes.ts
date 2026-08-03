import { Router } from 'express';
import { razorpayWebhook } from '../controllers/payment.controller';

const router = Router();

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     summary: Razorpay webhook — signature-verified; logs the event as a safety net alongside the client-driven verify-payment flow
 *     tags: [Payments]
 */
router.post('/webhook', razorpayWebhook);

export default router;
