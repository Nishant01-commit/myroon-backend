import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env';

export const razorpay =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
    : null;

/** Standard Razorpay Orders API checkout verification: HMAC-SHA256 of "order_id|payment_id". */
export const verifyPaymentSignature = (orderId: string, paymentId: string, signature: string): boolean => {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  return expected === signature;
};

/** Webhook signatures are computed over the raw request body — see types/express.d.ts. */
export const verifyWebhookSignature = (rawBody: Buffer, signature: string): boolean => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return expected === signature;
};
