import { Router } from 'express';
import {
  getDashboardSummary,
  listUsers,
  suspendUser,
  reactivateUser,
  createCoupon,
  listCoupons,
  updateCoupon,
  deactivateCoupon,
} from '../controllers/admin.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCouponSchema, updateCouponSchema, suspendUserSchema } from '../validators/admin.validator';

const router = Router();
router.use(protect, authorize('admin'));

/**
 * @openapi
 * /admin/dashboard-summary:
 *   get:
 *     summary: Platform-wide totals — users, owners, hotels, pending approvals, bookings, revenue
 *     tags: [Admin]
 * /admin/users:
 *   get:
 *     summary: List users, optional ?role= filter
 *     tags: [Admin]
 * /admin/users/{id}/suspend:
 *   patch:
 *     summary: Suspend a user and sign them out of every session
 *     tags: [Admin]
 * /admin/users/{id}/reactivate:
 *   patch:
 *     summary: Lift a suspension
 *     tags: [Admin]
 * /admin/coupons:
 *   get:
 *     summary: List all coupons
 *     tags: [Admin]
 *   post:
 *     summary: Create a coupon
 *     tags: [Admin]
 * /admin/coupons/{id}:
 *   patch:
 *     summary: Update a coupon
 *     tags: [Admin]
 * /admin/coupons/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a coupon
 *     tags: [Admin]
 */
router.get('/dashboard-summary', getDashboardSummary);

router.get('/users', listUsers);
router.patch('/users/:id/suspend', validate(suspendUserSchema), suspendUser);
router.patch('/users/:id/reactivate', reactivateUser);

router.get('/coupons', listCoupons);
router.post('/coupons', validate(createCouponSchema), createCoupon);
router.patch('/coupons/:id', validate(updateCouponSchema), updateCoupon);
router.patch('/coupons/:id/deactivate', deactivateCoupon);

export default router;
