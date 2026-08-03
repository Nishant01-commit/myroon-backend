import mongoose, { Schema, Document, Types } from 'mongoose';

export type PaymentStatus = 'created' | 'paid' | 'failed' | 'refunded';

export interface IPayment extends Document {
  booking: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method?: string;
  refund?: { amount: number; reason: string; refundedAt: Date; razorpayRefundId?: string };
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: String,
    razorpaySignature: { type: String, select: false },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
    method: String,
    refund: {
      amount: Number,
      reason: String,
      refundedAt: Date,
      razorpayRefundId: String,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ booking: 1 });

export default mongoose.model<IPayment>('Payment', paymentSchema);
