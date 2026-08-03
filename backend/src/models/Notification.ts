import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'booking_confirmation'
  | 'booking_cancellation'
  | 'hotel_approval'
  | 'payment_success'
  | 'password_reset'
  | 'email_verification'
  | 'review_request'
  | 'checkin_reminder'
  | 'checkout_reminder';

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedBooking?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'booking_confirmation',
        'booking_cancellation',
        'hotel_approval',
        'payment_success',
        'password_reset',
        'email_verification',
        'review_request',
        'checkin_reminder',
        'checkout_reminder',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedBooking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
