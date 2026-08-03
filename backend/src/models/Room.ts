import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRoom extends Document {
  hotel: Types.ObjectId;
  name: string;
  type: string;
  capacity: { adults: number; children: number };
  price: { base: number; discounted?: number };
  totalRooms: number;
  amenities: string[];
  photos: { url: string; publicId: string }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true }, // e.g. Standard, Deluxe, Suite
    capacity: {
      adults: { type: Number, required: true, min: 1 },
      children: { type: Number, default: 0 },
    },
    price: {
      base: { type: Number, required: true, min: 0 },
      discounted: { type: Number, min: 0 },
    },
    totalRooms: { type: Number, required: true, min: 1 },
    amenities: [{ type: String }],
    photos: [{ url: String, publicId: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ hotel: 1 });

/**
 * MVP architecture decision: availability for a date range is computed on
 * demand by counting overlapping, non-cancelled Bookings for this room,
 * rather than maintaining a separate day-by-day inventory/calendar
 * collection. Keeps the MVP simple; a dedicated RoomInventory collection can
 * be introduced later without breaking this schema if per-date pricing or
 * stricter overbooking protection becomes necessary.
 */

export default mongoose.model<IRoom>('Room', roomSchema);
