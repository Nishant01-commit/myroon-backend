import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import cloudinary from '../config/cloudinary';
import Invoice from '../models/Invoice';
import { IBooking } from '../models/Booking';
import { IHotel } from '../models/Hotel';
import { IRoom } from '../models/Room';
import { IPayment } from '../models/Payment';
import { IUser } from '../models/User';
import {HydratedDocument} from 'mongoose';
type InvoicePdfData = {
  booking: IBooking;
  hotel: IHotel;
  room: IRoom;
  payment: IPayment;
  customer: IUser;
};

export type InvoiceBooking = HydratedDocument<IBooking>;
export type InvoiceHotel = HydratedDocument<IHotel>;

export type InvoiceRoom = HydratedDocument<
  Omit<IRoom, 'hotel'> & {
    hotel: IHotel;
  }
>;

export type InvoicePayment = HydratedDocument<IPayment>;
export type InvoiceCustomer = HydratedDocument<IUser>;

const uploadPdfBuffer = (buffer: Buffer, publicId: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'myroomm/invoices', public_id: publicId, resource_type: 'raw', format: 'pdf' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Invoice upload failed'));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

const renderInvoicePdf = (
  params: InvoicePdfData & {
    invoiceNumber: string;
    qrDataUrl: string;
  }
): Promise<Buffer> => {
  const {
    invoiceNumber,
    booking,
    hotel,
    room,
    payment,
    customer,
    qrDataUrl,
  } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fillColor('#1E3A8A').fontSize(22).font('Helvetica-Bold').text('MyRoomm.in', 50, 50);
    doc.fillColor('#666666').fontSize(10).font('Helvetica').text('Tax Invoice', 50, 78);

    doc.fillColor('#191B24').fontSize(10);
    doc.text(`Invoice No: ${invoiceNumber}`, 300, 50, { align: 'right', width: 245 });
    doc.text(`Booking ID: ${booking.bookingId}`, 300, 65, { align: 'right', width: 245 });
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 300, 80, { align: 'right', width: 245 });

    doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#e5e5e5').stroke();

    // Customer / hotel details
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#191B24').text('Billed To', 50, 130);
    doc.font('Helvetica').fontSize(10);
    doc.text(customer.name, 50, 148);
    doc.text(customer.email, 50, 162);

    doc.font('Helvetica-Bold').fontSize(11).text('Hotel', 300, 130);
    doc.font('Helvetica').fontSize(10);
    doc.text(hotel.name, 300, 148);
    doc.text(`${hotel.address.city}, ${hotel.address.state}`, 300, 162);
    if (hotel.gstNumber) doc.text(`GSTIN: ${hotel.gstNumber}`, 300, 176);

    // Stay details
    let y = 220;
    doc.font('Helvetica-Bold').fontSize(11).text('Stay Details', 50, y);
    y += 20;
    doc.font('Helvetica').fontSize(10);
    doc.text(`Room: ${room.name} (${room.type})`, 50, y);
    y += 16;
    doc.text(`Check-in: ${booking.checkIn.toLocaleDateString('en-IN')}`, 50, y);
    doc.text(`Check-out: ${booking.checkOut.toLocaleDateString('en-IN')}`, 300, y);
    y += 16;
    doc.text(`Guests: ${booking.guests.adults} adult(s), ${booking.guests.children} child(ren)`, 50, y);

    // Pricing
    y += 40;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e5e5').stroke();
    y += 15;

    const row = (label: string, amount: number, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor('#191B24');
      doc.text(label, 50, y);
      doc.text(`Rs. ${amount.toFixed(2)}`, 300, y, { align: 'right', width: 245 });
      y += bold ? 22 : 18;
    };

    row('Room Charges', booking.pricing.roomPrice);
    if (booking.pricing.discount > 0) {
      row(`Discount${booking.pricing.couponCode ? ` (${booking.pricing.couponCode})` : ''}`, -booking.pricing.discount);
    }
    row('GST', booking.pricing.gst);
    row('Platform Fee', booking.pricing.platformFee);
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e5e5').stroke();
    y += 10;
    row('Total Paid', booking.pricing.grandTotal, true);

    doc.font('Helvetica').fontSize(9).fillColor('#666666').text(`Payment ID: ${payment.razorpayPaymentId ?? '—'}`, 50, y + 12);
    doc.image(qrDataUrl, 470, y + 2, { width: 75 });

    doc
      .fontSize(8)
      .fillColor('#999999')
      .text(
        'This is a system-generated invoice. Confirm current GST treatment for hotel accommodation with your accountant.',
        50,
        740,
        { width: 495 }
      );

    doc.end();
  });
};


export const generateInvoice = async (
  booking: IBooking,
  hotel: IHotel,
  room: IRoom,
  payment: IPayment,
  customer: IUser
) => {
  const invoiceNumber = `INV-${new Date().getFullYear()}-${booking.bookingId.slice(-6)}`;
  const qrDataUrl = await QRCode.toDataURL(`https://myroomm.in/bookings/${booking.bookingId}`, { margin: 1, width: 150 });

  const pdfBuffer = await renderInvoicePdf({ invoiceNumber, booking, hotel, room, payment, customer, qrDataUrl });
  const pdfUrl = await uploadPdfBuffer(pdfBuffer, `invoice-${booking.bookingId}`);

  

  return Invoice.create({
    booking: booking._id,
    invoiceNumber,
    customerSnapshot: { name: customer.name, email: customer.email, phone: customer.phone, address: customer.address },
    hotelSnapshot: {
      name: hotel.name,
      address: `${hotel.address.street}, ${hotel.address.city}`,
      gstNumber: hotel.gstNumber,
    },
    roomSnapshot: { name: room.name, type: room.type },
    pricingSnapshot: booking.pricing,
    paymentId: payment.razorpayPaymentId,
    pdfUrl,
    qrCodeData: qrDataUrl,
  });
};


