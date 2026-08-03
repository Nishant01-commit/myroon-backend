import mongoose, { Schema, Document, Types } from 'mongoose';

export type EmailStatus = 'queued' | 'sent' | 'failed' | 'retrying';

export interface IEmailLog extends Document {
  to: string;
  template: string;
  subject: string;
  status: EmailStatus;
  relatedBooking?: Types.ObjectId;
  attempts: number;
  lastError?: string;
  sentAt?: Date;
  createdAt: Date;
}

const emailLogSchema = new Schema<IEmailLog>(
  {
    to: { type: String, required: true },
    template: { type: String, required: true }, // e.g. 'booking_confirmation'
    subject: { type: String, required: true },
    status: { type: String, enum: ['queued', 'sent', 'failed', 'retrying'], default: 'queued' },
    relatedBooking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    attempts: { type: Number, default: 0 },
    lastError: String,
    sentAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

emailLogSchema.index({ status: 1 });
emailLogSchema.index({ relatedBooking: 1 });

/**
 * Corresponds to the "Email Queue" entry in the product spec's database
 * list. The LIVE queue mechanics (retries, backoff, delayed jobs) are
 * handled by BullMQ + Redis, not MongoDB — Mongo is a poor fit for a
 * high-churn job queue. This model instead gives a durable, queryable
 * record of what was sent or failed, satisfying "log the failure, retry via
 * the queue" without duplicating queue state in two places. A failed email
 * here must never mark a Booking invalid.
 */

export default mongoose.model<IEmailLog>('EmailLog', emailLogSchema);
