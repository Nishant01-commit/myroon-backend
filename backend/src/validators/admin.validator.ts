import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(20),
  type: z.enum(['flat', 'percentage']),
  value: z.coerce.number().positive(),
  maxDiscountAmount: z.coerce.number().positive().optional(),
  minBookingAmount: z.coerce.number().min(0).default(0),
  expiryDate: z.coerce.date(),
  usageLimit: z.coerce.number().int().positive().optional(),
  usageLimitPerUser: z.coerce.number().int().positive().default(1),
});

export const updateCouponSchema = createCouponSchema.partial();

export const suspendUserSchema = z.object({
  reason: z.string().trim().optional(),
});
