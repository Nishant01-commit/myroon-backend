import { Response } from 'express';
import User from '../models/User';
import Notification from '../models/Notification';
import Booking from '../models/Booking';
import { ApiResponse, catchAsync } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

export const getDashboardSummary = catchAsync(async (req: AuthRequest, res: Response) => {
  const [upcomingCount, totalBookings, unreadNotifications] = await Promise.all([
    Booking.countDocuments({ customer: req.user!.userId, status: 'confirmed', checkIn: { $gte: new Date() } }),
    Booking.countDocuments({ customer: req.user!.userId }),
    Notification.countDocuments({ user: req.user!.userId, isRead: false }),
  ]);

  return ApiResponse.success(res, { upcomingCount, totalBookings, unreadNotifications });
});

export const getWishlist = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.userId).populate('wishlist', 'name slug address images rating');
  return ApiResponse.success(res, user?.wishlist ?? []);
});

export const addToWishlist = catchAsync(async (req: AuthRequest, res: Response) => {
  await User.findByIdAndUpdate(req.user!.userId, { $addToSet: { wishlist: req.params.hotelId } });
  return ApiResponse.success(res, null, 'Added to wishlist.');
});

export const removeFromWishlist = catchAsync(async (req: AuthRequest, res: Response) => {
  await User.findByIdAndUpdate(req.user!.userId, { $pull: { wishlist: req.params.hotelId } });
  return ApiResponse.success(res, null, 'Removed from wishlist.');
});

export const listNotifications = catchAsync(async (req: AuthRequest, res: Response) => {
  const notifications = await Notification.find({ user: req.user!.userId }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ user: req.user!.userId, isRead: false });
  return ApiResponse.success(res, { notifications, unreadCount });
});

export const markNotificationRead = catchAsync(async (req: AuthRequest, res: Response) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user!.userId }, { isRead: true });
  return ApiResponse.success(res, null, 'Marked as read.');
});

export const markAllNotificationsRead = catchAsync(async (req: AuthRequest, res: Response) => {
  await Notification.updateMany({ user: req.user!.userId, isRead: false }, { isRead: true });
  return ApiResponse.success(res, null, 'All notifications marked as read.');
});
