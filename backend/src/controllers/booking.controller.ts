import { Response } from 'express';
import { Types } from 'mongoose';
import { IHotel } from '../models/Hotel';
import Room from '../models/Room';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import User, { IUser } from '../models/User';
import AuditLog from '../models/AuditLog';
import { ApiError, ApiResponse, catchAsync } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';
import { razorpay, verifyPaymentSignature } from '../services/razorpay.service';
import { calculatePricing, recordCouponUsage } from '../services/pricing.service';
// import { generateInvoice } from '../services/invoice.service';
import { sendEmail } from '../services/email.service';
import { bookingConfirmationEmail, bookingCancellationEmail } from '../templates/bookingEmails';
import { createNotification } from '../services/notification.service';
import { logger } from '../config/logger';
import { env } from '../config/env';
import {
  generateInvoice,
  InvoiceBooking,
  InvoiceHotel,
  InvoiceRoom,
  InvoicePayment,
  InvoiceCustomer,
} from '../services/invoice.service';
import { IBooking } from '../models/Booking';
import { IRoom } from '../models/Room';
import { IPayment } from '../models/Payment';


const parseStayDates = (checkInRaw: string, checkOutRaw: string) => {
  const checkIn = new Date(checkInRaw);
  const checkOut = new Date(checkOutRaw);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    throw new ApiError(400, 'Provide a valid check-in and check-out date, with check-out after check-in.');
  }
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  return { checkIn, checkOut, nights };
};

const countOverlappingBookings = (roomId: string, checkIn: Date, checkOut: Date) =>
  Booking.countDocuments({
    room: roomId,
    status: { $in: ['pending', 'confirmed'] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });

// ---------------------------------------------------------------------------
// Create a Razorpay order — writes nothing to MongoDB yet. Per the product spec's
// core rule, nothing is persisted until verifyPayment confirms the signature below.
// ---------------------------------------------------------------------------
export const createBookingOrder = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!razorpay) throw new ApiError(503, 'Payments are not configured yet.');

  const { roomId, checkIn, checkOut, adults, children, couponCode } = req.body;

  const room = await Room.findById(roomId).populate<{ hotel: IHotel }>('hotel');
  if (!room || !room.isActive) throw new ApiError(404, 'Room not found.');
  if (room.hotel.status !== 'approved') throw new ApiError(400, 'This hotel is not currently accepting bookings.');
  if (adults > room.capacity.adults) throw new ApiError(400, `This room fits up to ${room.capacity.adults} adults.`);

  const { checkIn: checkInDate, checkOut: checkOutDate, nights } = parseStayDates(checkIn, checkOut);

  const overlapping = await countOverlappingBookings(String(room._id), checkInDate, checkOutDate);
  if (overlapping >= room.totalRooms) throw new ApiError(409, 'This room is fully booked for the selected dates.');

  const pricing = await calculatePricing(room.price.discounted ?? room.price.base, nights, couponCode, req.user!.userId);

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(pricing.grandTotal * 100), // paise
    currency: 'INR',
    receipt: `myroomm_${Date.now()}`,
    notes: {
      roomId: String(room._id),
      hotelId: String(room.hotel._id),
      customerId: req.user!.userId,
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate.toISOString(),
      adults: String(adults),
      children: String(children ?? 0),
      ...(pricing.couponCode && { couponCode: pricing.couponCode }),
    },
  });

  return ApiResponse.success(res, {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: env.RAZORPAY_KEY_ID,
    pricing,
  });
});

// ---------------------------------------------------------------------------
// Verify payment and create the booking. This is the ONLY place a Booking gets created.
// ---------------------------------------------------------------------------
export const verifyPayment = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!razorpay) throw new ApiError(503, 'Payments are not configured yet.');

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw new ApiError(400, 'Payment verification failed. If money was deducted, Razorpay auto-refunds unverified charges.');
  }

  // Idempotency: a retried verify call for an order that's already been turned into a
  // booking should return the existing booking, not create a duplicate.
  const existingPayment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (existingPayment?.booking) {
    const existingBooking = await Booking.findById(existingPayment.booking);
    return ApiResponse.success(res, existingBooking, 'Booking already confirmed.');
  }

  // Pull the AUTHORITATIVE booking details from the order itself, never from this request —
  // the amount actually charged was fixed when the order was created server-side, so this is
  // what stops a tampered request from booking a different room/date than what was paid for.
  const order = await razorpay.orders.fetch(razorpay_order_id);
  const notes = order.notes as Record<string, string>;

  const room = await Room.findById(notes.roomId).populate<{ hotel: IHotel }>('hotel');
  if (!room) throw new ApiError(404, 'Room no longer exists.');
  const hotel = room.hotel;

  const checkInDate = new Date(notes.checkIn);
  const checkOutDate = new Date(notes.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  const pricing = await calculatePricing(room.price.discounted ?? room.price.base, nights, notes.couponCode, notes.customerId);

  const bookingId = `MR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

  // Re-check availability at the moment of confirmation — someone else could have booked the
  // last room while this customer was paying. Money has already moved by this point, so an
  // oversold room still gets a real Booking (never silently dropped) — just flagged 'pending'
  // instead of 'confirmed', for a human to sort out (move dates, refund, etc.).
  const overlapping = await countOverlappingBookings(String(room._id), checkInDate, checkOutDate);
  const stillAvailable = overlapping < room.totalRooms;

  const booking = await Booking.create({
    bookingId,
    customer: notes.customerId,
    hotel: hotel._id,
    room: room._id,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    guests: { adults: Number(notes.adults), children: Number(notes.children) },
    pricing,
    status: stillAvailable ? 'confirmed' : 'pending',
  });

  const payment = await Payment.create({
    booking: booking._id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    amount: pricing.grandTotal,
    currency: 'INR',
    status: 'paid',
  });

  booking.payment = payment._id;
  await booking.save();
  await recordCouponUsage(pricing.couponCode);

  if (!stillAvailable) {
    logger.error(`Room ${room._id} oversold — booking ${booking.bookingId} needs manual review (dates/refund).`);
    await AuditLog.create({
      actor: notes.customerId,
      action: 'BOOKING_OVERSOLD_NEEDS_REVIEW',
      targetType: 'Booking',
      targetId: booking._id,
    });
  }

  // Invoice + confirmation email happen after the booking is durably saved. Per the product
  // spec, a failure in either of these must never undo or invalidate the booking itself.
  const customer = await User.findById(notes.customerId);
  let invoiceUrl: string | undefined;
  if (customer) {
    try {
      const invoice = await generateInvoice(
  booking as unknown as IBooking,
  hotel as unknown as IHotel,
  room as unknown as IRoom,
  payment as unknown as IPayment,
  customer as unknown as IUser
);
      booking.invoice = invoice._id;
      await booking.save();
      invoiceUrl = invoice.pdfUrl;
    } catch (err) {
      logger.error(`Invoice generation failed for booking ${booking.bookingId}: ${(err as Error).message}`);
    }

    await sendEmail({
      to: customer.email,
      subject: `Booking confirmed — ${booking.bookingId}`,
      html: bookingConfirmationEmail({ customerName: customer.name, booking:booking as any, hotel: hotel as any, room: room as any, invoiceUrl }),
      template: 'booking_confirmation',
      relatedBooking: String(booking._id),
    });

    await createNotification({
      user: String(customer._id),
      type: 'booking_confirmation',
      title: 'Booking confirmed',
      message: `Your stay at ${hotel.name} is confirmed. Booking ID: ${booking.bookingId}.`,
      relatedBooking: String(booking._id),
    });
  }

  return ApiResponse.success(res, booking, 'Payment verified — your booking is confirmed.', 201);
});

// ---------------------------------------------------------------------------
// Customer-facing history and cancellation
// ---------------------------------------------------------------------------

export const getMyBookings = catchAsync(async (req: AuthRequest, res: Response) => {
  const bookings = await Booking.find({ customer: req.user!.userId })
    .sort({ createdAt: -1 })
    .populate('hotel', 'name slug address images')
    .populate('room', 'name type');

  return ApiResponse.success(res, bookings);
});

export const getBookingById = catchAsync(async (req: AuthRequest, res: Response) => {
  const booking = await Booking.findById(req.params.id)
    .populate('hotel', 'name slug address images contactNumber')
    .populate('room', 'name type')
    .populate('invoice');

  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (String(booking.customer) !== req.user!.userId && req.user!.role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to view this booking.');
  }

  return ApiResponse.success(res, booking);
});

export const cancelBooking = catchAsync(async (req: AuthRequest, res: Response) => {
  const booking = await Booking.findById(req.params.id).populate<{ hotel: IHotel }>('hotel');
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (String(booking.customer) !== req.user!.userId && req.user!.role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to cancel this booking.');
  }
  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new ApiError(400, `A ${booking.status} booking can't be cancelled.`);
  }

  booking.status = 'cancelled';
  booking.cancellation = {
    reason: req.body.reason || 'Cancelled by customer',
    cancelledAt: new Date(),
    cancelledBy: new Types.ObjectId(req.user!.userId),
  };
  await booking.save();

  const customer = await User.findById(booking.customer);
  if (customer) {
    await sendEmail({
      to: customer.email,
      subject: `Booking ${booking.bookingId} cancelled`,
      html: bookingCancellationEmail({ customerName: customer.name, booking: booking as any, hotel: booking.hotel as any }),
      template: 'booking_cancellation',
      relatedBooking: String(booking._id),
    });
  }

  await createNotification({
    user: String(booking.hotel.owner),
    type: 'booking_cancellation',
    title: 'A booking was cancelled',
    message: `Booking ${booking.bookingId} at ${booking.hotel.name} was cancelled by the guest.`,
    relatedBooking: String(booking._id),
  });

  // NOTE — deliberately out of scope for this pass: this does not call Razorpay's refund API.
  // Marking the booking 'cancelled' is immediate; actually moving money back and flipping the
  // booking to 'refunded' once Razorpay confirms it is the natural next slice, likely
  // alongside the owner's dashboard refund workflow in Phase 5.
  return ApiResponse.success(res, booking, 'Booking cancelled.');
});
