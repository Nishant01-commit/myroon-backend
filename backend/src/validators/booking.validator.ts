import { z } from 'zod';

export const createOrderSchema = z.object({
  roomId: z.string().min(1, 'A room is required'),
  checkIn: z.string().min(1, 'Check-in date is required'),
  checkOut: z.string().min(1, 'Check-out date is required'),
  adults: z.coerce.number().int().min(1, 'At least 1 adult is required'),
  children: z.coerce.number().int().min(0).default(0),
  couponCode: z.string().trim().optional(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().optional(),
});
