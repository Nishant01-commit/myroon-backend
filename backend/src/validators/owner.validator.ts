import { z } from 'zod';

export const ownerCancelSchema = z.object({
  reason: z.string().trim().optional(),
});

export const refundSchema = z.object({
  amount: z.coerce.number().min(0).optional(), // omit for a full refund of the amount paid
  reason: z.string().trim().optional(),
});
