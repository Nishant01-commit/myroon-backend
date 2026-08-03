import mongoose, { Schema, Document, Types } from 'mongoose';

export type CouponType = 'flat' | 'percentage';

export interface ICoupon extends Document {
  code: string;
  type: CouponType;
  value: number;
  maxDiscountAmount?: number;
  minBookingAmount: number;
  expiryDate: Date;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usedCount: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['flat', 'percentage'], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscountAmount: Number,
    minBookingAmount: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    usageLimit: Number,
    usageLimitPerUser: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICoupon>('Coupon', couponSchema);
