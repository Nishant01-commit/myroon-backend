import { Router } from 'express';
import { createReview, listHotelReviews, listMyReviews, replyToReview, moderateReview } from '../controllers/review.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { imageUpload } from '../middleware/upload';
import { createReviewSchema, ownerReplySchema, moderateReviewSchema } from '../validators/review.validator';

const router = Router();

/**
 * @openapi
 * /reviews/hotel/{hotelId}:
 *   get:
 *     summary: List approved reviews for a hotel
 *     tags: [Reviews]
 */
router.get('/hotel/:hotelId', listHotelReviews);

router.get('/my', protect, authorize('customer'), listMyReviews);

/**
 * @openapi
 * /reviews:
 *   post:
 *     summary: Leave a review for a completed booking (one per booking, optional photos)
 *     tags: [Reviews]
 */
router.post('/', protect, authorize('customer'), imageUpload.array('photos', 5), validate(createReviewSchema), createReview);

/**
 * @openapi
 * /reviews/{id}/reply:
 *   patch:
 *     summary: Hotel owner (or admin) replies to a review
 *     tags: [Reviews]
 * /reviews/{id}/moderate:
 *   patch:
 *     summary: Admin sets isApproved/isFlagged on a review
 *     tags: [Reviews]
 */
router.patch('/:id/reply', protect, authorize('hotel_owner', 'admin'), validate(ownerReplySchema), replyToReview);
router.patch('/:id/moderate', protect, authorize('admin'), validate(moderateReviewSchema), moderateReview);

export default router;
