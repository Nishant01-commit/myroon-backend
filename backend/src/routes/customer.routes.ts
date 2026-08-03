import { Router } from 'express';
import {
  getDashboardSummary,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/customer.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();
router.use(protect, authorize('customer'));

/**
 * @openapi
 * /customer/dashboard-summary:
 *   get:
 *     summary: Upcoming bookings count, total bookings, unread notifications
 *     tags: [Customer]
 * /customer/wishlist:
 *   get:
 *     summary: List saved hotels
 *     tags: [Customer]
 * /customer/wishlist/{hotelId}:
 *   post:
 *     summary: Add a hotel to the wishlist
 *     tags: [Customer]
 *   delete:
 *     summary: Remove a hotel from the wishlist
 *     tags: [Customer]
 * /customer/notifications:
 *   get:
 *     summary: List notifications, most recent first, with an unread count
 *     tags: [Customer]
 * /customer/notifications/read-all:
 *   patch:
 *     summary: Mark every notification as read
 *     tags: [Customer]
 * /customer/notifications/{id}/read:
 *   patch:
 *     summary: Mark one notification as read
 *     tags: [Customer]
 */
router.get('/dashboard-summary', getDashboardSummary);
router.get('/wishlist', getWishlist);
router.post('/wishlist/:hotelId', addToWishlist);
router.delete('/wishlist/:hotelId', removeFromWishlist);
router.get('/notifications', listNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;
