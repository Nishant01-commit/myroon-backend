import mongoose, { Schema, Document, Types } from 'mongoose';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface ITicketReply {
  sender: Types.ObjectId;
  message: string;
  attachments: string[];
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  user: Types.ObjectId;
  subject: string;
  description: string;
  priority: TicketPriority;
  attachments: string[];
  status: TicketStatus;
  replies: ITicketReply[];
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    attachments: [{ type: String }],
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    replies: [
      {
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true },
        attachments: [{ type: String }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

supportTicketSchema.index({ user: 1 });
supportTicketSchema.index({ status: 1 });

export default mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);
