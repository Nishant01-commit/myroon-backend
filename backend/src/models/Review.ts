import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  booking: Types.ObjectId;
  customer: Types.ObjectId;
  hotel: Types.ObjectId;
  rating: number;
  comment: string;
  photos: { url: string; publicId: string }[];
  ownerReply?: { text: string; repliedAt: Date };
  isApproved: boolean;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 2000 },
    photos: [{ url: String, publicId: String }],
    ownerReply: { text: String, repliedAt: Date },
    isApproved: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per booking — also confirm booking.status === 'completed' at the controller layer (Phase 5).
reviewSchema.index({ booking: 1, customer: 1 }, { unique: true });
reviewSchema.index({ hotel: 1 });

export default mongoose.model<IReview>('Review', reviewSchema);
