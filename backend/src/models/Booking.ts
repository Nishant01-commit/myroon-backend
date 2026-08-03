import mongoose, { Schema, Document, Types } from 'mongoose';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';

export interface IBooking extends Document {
  bookingId: string;
  customer: Types.ObjectId;
  hotel: Types.ObjectId;
  room: Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: { adults: number; children: number };
  pricing: {
    roomPrice: number;
    gst: number;
    platformFee: number;
    discount: number;
    couponCode?: string;
    grandTotal: number;
  };
  status: BookingStatus;
  payment?: Types.ObjectId;
  invoice?: Types.ObjectId;
  cancellation?: { reason: string; cancelledAt: Date; cancelledBy: Types.ObjectId };
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingId: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { adults: { type: Number, required: true, min: 1 }, children: { type: Number, default: 0 } },
    pricing: {
      roomPrice: { type: Number, required: true },
      gst: { type: Number, required: true, default: 0 },
      platformFee: { type: Number, required: true, default: 0 },
      discount: { type: Number, default: 0 },
      couponCode: String,
      grandTotal: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'],
      default: 'pending',
    },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    cancellation: {
      reason: String,
      cancelledAt: Date,
      cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ customer: 1 });
bookingSchema.index({ hotel: 1 });
bookingSchema.index({ status: 1 });

/**
 * IMPORTANT (business rule from the product spec): a Booking document must
 * only ever be created AFTER Razorpay payment signature verification
 * succeeds. This model intentionally has no "draft"/"cart" state — a
 * "pending" booking here should already represent a payment being
 * confirmed, never an unpaid cart. See Phase 4 (Booking & Payments) for the
 * controller that enforces this.
 */

export default mongoose.model<IBooking>('Booking', bookingSchema);
