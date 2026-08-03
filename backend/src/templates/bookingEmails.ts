import { wrapper } from './emailLayout';
import { IBooking } from '../models/Booking';
import { IHotel } from '../models/Hotel';
import { IRoom } from '../models/Room';
import { Types } from "mongoose";

export const bookingConfirmationEmail = (params: {
  customerName: string;
  booking: any;
  hotel: any;
  room: any;
  invoiceUrl?: string;
}): string => {
  const { customerName, booking, hotel, room, invoiceUrl } = params;
  return wrapper(`
    <h2 style="color:#1e3a8a;margin-top:0;">You're all set, ${customerName}!</h2>
    <p>Your stay at <strong>${hotel.name}</strong> is confirmed.</p>
    <table style="width:100%;margin:20px 0;font-size:14px;color:#333;">
      <tr><td style="padding:6px 0;color:#6b7280;">Booking ID</td><td style="text-align:right;font-weight:bold;">${booking.bookingId}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Room</td><td style="text-align:right;">${room.name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Check-in</td><td style="text-align:right;">${booking.checkIn.toLocaleDateString('en-IN')}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Check-out</td><td style="text-align:right;">${booking.checkOut.toLocaleDateString('en-IN')}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Guests</td><td style="text-align:right;">${booking.guests.adults} adult(s), ${booking.guests.children} child(ren)</td></tr>
      <tr><td style="padding:10px 0 0;color:#1e3a8a;font-weight:bold;">Total Paid</td><td style="text-align:right;padding:10px 0 0;font-weight:bold;color:#1e3a8a;">Rs. ${booking.pricing.grandTotal.toFixed(2)}</td></tr>
    </table>
    ${
      invoiceUrl
        ? `<p style="text-align:center;margin:28px 0;"><a href="${invoiceUrl}" style="background:#d4af37;color:#1e3a8a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Download Invoice</a></p>`
        : ''
    }
    <p style="color:#6b7280;font-size:13px;">May your stay bring peace and comfort after the journey. Safe travels!</p>
  `);
};

export const bookingCancellationEmail = (params: { customerName: string; booking: IBooking; hotel: IHotel }): string => {
  const { customerName, booking, hotel } = params;
  return wrapper(`
    <h2 style="color:#1e3a8a;margin-top:0;">Booking cancelled</h2>
    <p>Hi ${customerName}, your booking <strong>${booking.bookingId}</strong> at ${hotel.name} has been cancelled.</p>
    <p style="color:#6b7280;font-size:13px;">If a refund is due, it'll go back to your original payment method — Razorpay typically settles refunds within 5–7 business days.</p>
  `);
};
