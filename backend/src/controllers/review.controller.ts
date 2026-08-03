import { Response } from 'express';
import Review from '../models/Review';
import Booking from '../models/Booking';
import Hotel, { IHotel } from '../models/Hotel';
import { ApiError, ApiResponse, catchAsync } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';
import { uploadImages } from '../services/upload.service';

export const createReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const { bookingId, rating, comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (String(booking.customer) !== req.user!.userId) {
    throw new ApiError(403, 'You can only review your own bookings.');
  }
  if (booking.status !== 'completed') {
    throw new ApiError(400, 'Only completed stays can be reviewed.');
  }

  const existing = await Review.findOne({ booking: bookingId, customer: req.user!.userId });
  if (existing) throw new ApiError(409, 'You have already reviewed this booking.');

  const files = (req.files as Express.Multer.File[]) || [];
  const photos = files.length ? await uploadImages(files, 'reviews') : [];

  const review = await Review.create({
    booking: bookingId,
    customer: req.user!.userId,
    hotel: booking.hotel,
    rating,
    comment,
    photos,
  });

  // Recompute the hotel's aggregate rating from scratch — simple and correct at this data
  // scale. Worth switching to an incremental running-average update if review volume ever
  // makes a full recount on every new review noticeably slow.
  const [stats] = await Review.aggregate([
    { $match: { hotel: booking.hotel, isApproved: true } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Hotel.findByIdAndUpdate(booking.hotel, {
    'rating.average': stats?.average ?? 0,
    'rating.count': stats?.count ?? 0,
  });

  return ApiResponse.success(res, review, 'Review submitted.', 201);
});

export const listHotelReviews = catchAsync(async (req: AuthRequest, res: Response) => {
  const reviews = await Review.find({ hotel: req.params.hotelId, isApproved: true })
    .sort({ createdAt: -1 })
    .populate('customer', 'name profilePhoto');

  return ApiResponse.success(res, reviews);
});

export const listMyReviews = catchAsync(async (req: AuthRequest, res: Response) => {
  const reviews = await Review.find({ customer: req.user!.userId }).sort({ createdAt: -1 }).populate('hotel', 'name slug');
  return ApiResponse.success(res, reviews);
});

export const replyToReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const review = await Review.findById(req.params.id).populate<{ hotel: IHotel }>('hotel');
  if (!review) throw new ApiError(404, 'Review not found.');

  if (String(review.hotel.owner) !== req.user!.userId && req.user!.role !== 'admin') {
    throw new ApiError(403, 'Only the hotel owner can reply to this review.');
  }

  review.ownerReply = { text: req.body.text, repliedAt: new Date() };
  await review.save();

  return ApiResponse.success(res, review, 'Reply posted.');
});

export const moderateReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const { isApproved, isFlagged } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found.');

  if (isApproved !== undefined) review.isApproved = isApproved;
  if (isFlagged !== undefined) review.isFlagged = isFlagged;
  await review.save();

  return ApiResponse.success(res, review, 'Review updated.');
});
