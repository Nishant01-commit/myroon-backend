import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().min(1, 'A completed booking is required to leave a review'),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10, 'Comment must be at least 10 characters').max(2000),
});

export const ownerReplySchema = z.object({
  text: z.string().trim().min(1, 'Reply cannot be empty').max(1000),
});

export const moderateReviewSchema = z.object({
  isApproved: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
});
