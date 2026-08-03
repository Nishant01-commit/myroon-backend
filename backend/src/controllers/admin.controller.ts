import { Response } from 'express';
import User from '../models/User';
import Hotel from '../models/Hotel';
import Booking from '../models/Booking';
import Coupon from '../models/Coupon';
import AuditLog from '../models/AuditLog';
import { ApiError, ApiResponse, catchAsync } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';

export const getDashboardSummary = catchAsync(async (req: AuthRequest, res: Response) => {
  const [totalUsers, totalOwners, totalHotels, pendingHotels, totalBookings, revenueResult] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'hotel_owner' }),
    Hotel.countDocuments({ status: 'approved' }),
    Hotel.countDocuments({ status: 'pending' }),
    Booking.countDocuments({ status: { $in: ['confirmed', 'completed'] } }),
    Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$pricing.grandTotal' } } },
    ]),
  ]);

  return ApiResponse.success(res, {
    totalUsers,
    totalOwners,
    totalHotels,
    pendingHotels,
    totalBookings,
    totalRevenue: revenueResult[0]?.total ?? 0,
  });
});

export const listUsers = catchAsync(async (req: AuthRequest, res: Response) => {
  const { role } = req.query as { role?: string };
  const filter = role ? { role } : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).select('-refreshTokens');
  return ApiResponse.success(res, users);
});

export const suspendUser = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user.role === 'admin') throw new ApiError(400, 'Admins cannot be suspended this way.');

  user.isSuspended = true;
  user.refreshTokens = []; // sign them out everywhere immediately
  await user.save();

  await AuditLog.create({
    actor: req.user!.userId,
    action: 'USER_SUSPENDED',
    targetType: 'User',
    targetId: user._id,
    metadata: { reason: req.body.reason },
  });

  return ApiResponse.success(res, null, 'User suspended.');
});

export const reactivateUser = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  user.isSuspended = false;
  await user.save();

  await AuditLog.create({
    actor: req.user!.userId,
    action: 'USER_REACTIVATED',
    targetType: 'User',
    targetId: user._id,
  });

  return ApiResponse.success(res, null, 'User reactivated.');
});

// --- Coupons ---

export const createCoupon = catchAsync(async (req: AuthRequest, res: Response) => {
  const coupon = await Coupon.create({ ...req.body, createdBy: req.user!.userId });
  return ApiResponse.success(res, coupon, 'Coupon created.', 201);
});

export const listCoupons = catchAsync(async (req: AuthRequest, res: Response) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  return ApiResponse.success(res, coupons);
});

export const updateCoupon = catchAsync(async (req: AuthRequest, res: Response) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!coupon) throw new ApiError(404, 'Coupon not found.');
  return ApiResponse.success(res, coupon, 'Coupon updated.');
});

export const deactivateCoupon = catchAsync(async (req: AuthRequest, res: Response) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!coupon) throw new ApiError(404, 'Coupon not found.');
  return ApiResponse.success(res, coupon, 'Coupon deactivated.');
});
