import crypto from 'crypto';
import { verifyPaymentSignature, verifyWebhookSignature } from '../../src/services/razorpay.service';

describe('razorpay.service — signature verification', () => {
  it('accepts a correctly computed payment signature', () => {
    const orderId = 'order_test123';
    const paymentId = 'pay_test456';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(verifyPaymentSignature(orderId, paymentId, signature)).toBe(true);
  });

  it('rejects a tampered payment signature', () => {
    expect(verifyPaymentSignature('order_test123', 'pay_test456', 'not-a-real-signature')).toBe(false);
  });

  it('rejects a valid signature checked against a different payment id', () => {
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update('order_test123|pay_test456')
      .digest('hex');

    expect(verifyPaymentSignature('order_test123', 'pay_DIFFERENT', signature)).toBe(false);
  });

  it('accepts a correctly computed webhook signature over the raw body', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(rawBody).digest('hex');

    expect(verifyWebhookSignature(rawBody, signature)).toBe(true);
  });

  it('rejects a webhook signature that does not match the body', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    expect(verifyWebhookSignature(rawBody, 'wrong-signature')).toBe(false);
  });
});
