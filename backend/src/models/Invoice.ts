import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInvoice extends Document {
  booking: Types.ObjectId;
  invoiceNumber: string;
  customerSnapshot: { name: string; email: string; phone?: string; address?: string };
  hotelSnapshot: { name: string; address: string; gstNumber?: string };
  roomSnapshot: { name: string; type: string };
  pricingSnapshot: {
    roomPrice: number;
    gst: number;
    platformFee: number;
    discount: number;
    grandTotal: number;
  };
  paymentId?: string;
  pdfUrl?: string;
  qrCodeData?: string;
  createdAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true },
    customerSnapshot: { name: String, email: String, phone: String, address: String },
    hotelSnapshot: { name: String, address: String, gstNumber: String },
    roomSnapshot: { name: String, type: String },
    pricingSnapshot: {
      roomPrice: Number,
      gst: Number,
      platformFee: Number,
      discount: Number,
      grandTotal: Number,
    },
    paymentId: String,
    pdfUrl: String,
    qrCodeData: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

/**
 * Invoices intentionally store SNAPSHOTS rather than only references. A
 * hotel's name or a room's price can change after a guest's stay — the
 * invoice must stay accurate to what was actually charged at the time, for
 * accounting/legal reasons.
 */

export default mongoose.model<IInvoice>('Invoice', invoiceSchema);
