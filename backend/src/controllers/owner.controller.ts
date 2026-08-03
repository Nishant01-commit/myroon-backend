import { Response } from 'express';
import { Types } from 'mongoose';
import Hotel, { IHotel } from '../models/Hotel';
import Room from '../models/Room';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import User from '../models/User';
import { ApiError, ApiResponse, catchAsync } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';
import { razorpay } from '../services/razorpay.service';
import { sendEmail } from '../services/email.service';
import { bookingCancellationEmail } from '../templates/bookingEmails';
import { createNotification } from '../services/notification.service';
import { logger } from '../config/logger';

const getOwnerHotelIds = async (ownerId: string) => {
  const hotels = await Hotel.find({ owner: ownerId }).select('_id');
  return hotels.map((h) => h._id);
};

const assertOwnerControlsBooking = async (bookingId: string, ownerId: string, role: string) => {
  const booking = await Booking.findById(bookingId).populate<{ hotel: IHotel }>('hotel');
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (String(booking.hotel.owner) !== ownerId && role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to manage this booking.');
  }
  return booking;
};

export const getOwnerBookings = catchAsync(async (req: AuthRequest, res: Response) => {
  const hotelIds = await getOwnerHotelIds(req.user!.userId);
  const { status } = req.query as { status?: string };

  const filter: Record<string, unknown> = { hotel: { $in: hotelIds } };
  if (status) filter.status = status;

  const bookings = await Booking.find(filter)
    .sort({ createdAt: -1 })
    .populate('customer', 'name email phone')
    .populate('hotel', 'name')
    .populate('room', 'name type');

  return ApiResponse.success(res, bookings);
});

/**
 * NOTE on "Accept/Reject": the product spec lists Accept/Reject among the owner's booking
 * controls, but this platform's booking flow is payment-first (see Booking.ts from Phase 1) —
 * a Booking is only ever created AFTER Razorpay confirms payment, so there's no pre-payment
 * "requested" booking left for an owner to accept or reject. What an owner CAN do post-payment
 * is cancel a confirmed stay (below), mark it completed at checkout, and issue a refund —
 * covering the same underlying need (the hotel calling off a booking) without a state that
 * would contradict "never save a booking before payment verification."
 */
export const ownerCancelBooking = catchAsync(async (req: AuthRequest, res: Response) => {
  const booking = await assertOwnerControlsBooking(req.params.id, req.user!.userId, req.user!.role);
  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new ApiError(400, `A ${booking.status} booking can't be cancelled.`);
  }

  booking.status = 'cancelled';
  booking.cancellation = {
    reason: req.body.reason || 'Cancelled by the hotel',
    cancelledAt: new Date(),
    cancelledBy: new Types.ObjectId(req.user!.userId),
  };
  await booking.save();

  const customer = await User.findById(booking.customer);
  if (customer) {
    await sendEmail({
      to: customer.email,
      subject: `Booking ${booking.bookingId} cancelled by the hotel`,
      html: bookingCancellationEmail({ customerName: customer.name, booking:booking as any , hotel: booking.hotel as any }),
      template: 'booking_cancellation',
      relatedBooking: String(booking._id),
    });
    await createNotification({
      user: String(customer._id),
      type: 'booking_cancellation',
      title: 'Booking cancelled',
      message: `Your booking ${booking.bookingId} at ${booking.hotel.name} was cancelled by the hotel.`,
      relatedBooking: String(booking._id),
    });
  }

  return ApiResponse.success(res, booking, 'Booking cancelled.');
});

export const completeBooking = catchAsync(async (req: AuthRequest, res: Response) => {
  const booking = await assertOwnerControlsBooking(req.params.id, req.user!.userId, req.user!.role);
  if (booking.status !== 'confirmed') throw new ApiError(400, 'Only a confirmed booking can be marked completed.');

  booking.status = 'completed';
  await booking.save();

  return ApiResponse.success(res, booking, 'Booking marked completed — the guest can now leave a review.');
});

export const refundBooking = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!razorpay) throw new ApiError(503, 'Payments are not configured yet.');

  const booking = await assertOwnerControlsBooking(req.params.id, req.user!.userId, req.user!.role);
  if (!['confirmed', 'cancelled'].includes(booking.status)) {
    throw new ApiError(400, 'Only a confirmed or cancelled booking can be refunded.');
  }

  const payment = await Payment.findById(booking.payment);
  if (!payment || payment.status !== 'paid' || !payment.razorpayPaymentId) {
    throw new ApiError(400, 'No paid payment found for this booking.');
  }

  const { amount, reason } = req.body as { amount?: number; reason?: string };
  const refundAmount = amount ?? payment.amount;

  const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
    amount: Math.round(refundAmount * 100), // paise
    notes: { bookingId: booking.bookingId, reason: reason ?? 'Refund issued by hotel/admin' },
  });

  payment.status = 'refunded';
  payment.refund = {
    amount: refundAmount,
    reason: reason ?? 'Refund issued',
    refundedAt: new Date(),
    razorpayRefundId: refund.id,
  };
  await payment.save();

  booking.status = 'refunded';
  await booking.save();

  const customer = await User.findById(booking.customer);
  if (customer) {
    await createNotification({
      user: String(customer._id),
      // No dedicated 'refund_processed' type yet — 'payment_success' is the closest existing
      // one; adding a proper type to Notification.ts is a quick follow-up if this matters.
      type: 'payment_success',
      title: 'Refund processed',
      message: `Rs. ${refundAmount} was refunded for booking ${booking.bookingId}.`,
      relatedBooking: String(booking._id),
    });
  }

  logger.info(`Refund ${refund.id} processed for booking ${booking.bookingId}: Rs. ${refundAmount}`);
  return ApiResponse.success(res, booking, 'Refund processed.');
});

export const getOwnerRevenue = catchAsync(async (req: AuthRequest, res: Response) => {
  const hotelIds = await getOwnerHotelIds(req.user!.userId);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const revenueBetween = async (since: Date, until?: Date) => {
    const match: Record<string, unknown> = {
      hotel: { $in: hotelIds },
      status: { $in: ['confirmed', 'completed'] },
      createdAt: until ? { $gte: since, $lt: until } : { $gte: since },
    };
    const [result] = await Booking.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$pricing.grandTotal' }, count: { $sum: 1 } } },
    ]);
    return { total: result?.total ?? 0, count: result?.count ?? 0 };
  };

  const [today, thisMonth, lastMonth, totalBookings] = await Promise.all([
    revenueBetween(startOfToday),
    revenueBetween(startOfMonth),
    revenueBetween(startOfLastMonth, startOfMonth),
    Booking.countDocuments({ hotel: { $in: hotelIds } }),
  ]);

  const revenueGrowthPercent =
    lastMonth.total > 0 ? Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100) : null;

  // Occupancy: booked room-nights this month (clipped to the month) divided by total
  // available room-nights this month. An approximation appropriate for a dashboard stat, not
  // a precise inventory calculation — see the note in Room.ts on how availability is modeled.
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysInMonth = (monthEnd.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24);
  const rooms = await Room.find({ hotel: { $in: hotelIds }, isActive: true });
  const totalRoomNights = rooms.reduce((sum, r) => sum + r.totalRooms, 0) * daysInMonth;

  let occupancyPercent = 0;
  if (totalRoomNights > 0) {
    const monthBookings = await Booking.find({
      hotel: { $in: hotelIds },
      status: { $in: ['confirmed', 'completed'] },
      checkIn: { $lt: monthEnd },
      checkOut: { $gt: startOfMonth },
    });
    const bookedRoomNights = monthBookings.reduce((sum, b) => {
      const overlapStart = b.checkIn > startOfMonth ? b.checkIn : startOfMonth;
      const overlapEnd = b.checkOut < monthEnd ? b.checkOut : monthEnd;
      const nights = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
      return sum + nights;
    }, 0);
    occupancyPercent = Math.round((bookedRoomNights / totalRoomNights) * 100);
  }

  return ApiResponse.success(res, {
    todayRevenue: today.total,
    monthRevenue: thisMonth.total,
    monthBookings: thisMonth.count,
    revenueGrowthPercent,
    occupancyPercent,
    totalBookings,
  });
});
