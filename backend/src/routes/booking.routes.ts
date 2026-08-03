import { Router } from 'express';
import {
  createBookingOrder,
  verifyPayment,
  getMyBookings,
  getBookingById,
  cancelBooking,
} from '../controllers/booking.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createOrderSchema, verifyPaymentSchema, cancelBookingSchema } from '../validators/booking.validator';

const router = Router();

/**
 * @openapi
 * /bookings/create-order:
 *   post:
 *     summary: Create a Razorpay order for a room/date selection — writes nothing to MongoDB yet
 *     tags: [Bookings]
 */
router.post('/create-order', protect, authorize('customer'), validate(createOrderSchema), createBookingOrder);

/**
 * @openapi
 * /bookings/verify-payment:
 *   post:
 *     summary: Verify a completed Razorpay payment and create the booking — the only place a Booking is created
 *     tags: [Bookings]
 */
router.post('/verify-payment', protect, authorize('customer'), validate(verifyPaymentSchema), verifyPayment);

router.get('/my', protect, authorize('customer'), getMyBookings);
router.get('/:id', protect, getBookingById);
router.patch('/:id/cancel', protect, validate(cancelBookingSchema), cancelBooking);

export default router;
