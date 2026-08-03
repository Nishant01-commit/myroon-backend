import { Request, Response } from 'express';
import { verifyWebhookSignature } from '../services/razorpay.service';
import { logger } from '../config/logger';
import { catchAsync } from '../utils/apiHelpers';

/**
 * The client-side verify-payment flow (booking.controller.ts) is the primary path that
 * creates bookings. This webhook is a signature-verified safety net for the case where that
 * call never reaches the server — closed tab, dropped connection, etc. — right now it only
 * logs the event; it does NOT yet reconcile a paid-but-unbooked order into a Booking. That
 * reconciliation (checking for paid Razorpay orders with no matching Booking, on a schedule)
 * is a good addition once real traffic makes the gap worth closing — deliberately left out
 * here rather than half-building a second, harder-to-verify path to booking creation.
 */
export const razorpayWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;

  if (!signature || !req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
    logger.error('Razorpay webhook signature missing or invalid — ignoring.');
    return res.status(400).json({ success: false });
  }

  logger.info(`Razorpay webhook received: ${req.body.event}`);
  res.json({ success: true });
});
