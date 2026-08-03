import { Router } from 'express';
import { getOwnerBookings, ownerCancelBooking, completeBooking, refundBooking, getOwnerRevenue } from '../controllers/owner.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ownerCancelSchema, refundSchema } from '../validators/owner.validator';

const router = Router();
router.use(protect, authorize('hotel_owner', 'admin'));

/**
 * @openapi
 * /owner/bookings:
 *   get:
 *     summary: Bookings across all of the owner's hotels, optional ?status= filter
 *     tags: [Owner]
 * /owner/revenue:
 *   get:
 *     summary: Today/this-month/last-month revenue, growth %, and occupancy %
 *     tags: [Owner]
 * /owner/bookings/{id}/cancel:
 *   patch:
 *     summary: Owner cancels a booking at their hotel (no refund — see /refund)
 *     tags: [Owner]
 * /owner/bookings/{id}/complete:
 *   patch:
 *     summary: Mark a confirmed booking completed (checkout done, guest can now review)
 *     tags: [Owner]
 * /owner/bookings/{id}/refund:
 *   patch:
 *     summary: Issue a real Razorpay refund for a booking's payment
 *     tags: [Owner]
 */
router.get('/bookings', getOwnerBookings);
router.get('/revenue', getOwnerRevenue);
router.patch('/bookings/:id/cancel', validate(ownerCancelSchema), ownerCancelBooking);
router.patch('/bookings/:id/complete', completeBooking);
router.patch('/bookings/:id/refund', validate(refundSchema), refundBooking);

export default router;
