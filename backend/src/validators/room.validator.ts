import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().trim().min(2, 'Room name is required').max(100),
  type: z.string().trim().min(2, 'Room type is required'),
  adults: z.coerce.number().int().min(1, 'At least 1 adult of capacity is required'),
  children: z.coerce.number().int().min(0).default(0),
  basePrice: z.coerce.number().min(0, 'Price must be a positive number'),
  discountedPrice: z.coerce.number().min(0).optional(),
  totalRooms: z.coerce.number().int().min(1, 'At least 1 room is required'),
  amenities: z.array(z.string()).default([]),
});

export const updateRoomSchema = createRoomSchema.partial().extend({
  isActive: z.coerce.boolean().optional(),
});
