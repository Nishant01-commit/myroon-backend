import { env } from '../config/env';
import Coupon from '../models/Coupon';
import Booking from '../models/Booking';
import { ApiError } from '../utils/apiHelpers';

export interface PricingBreakdown {
  roomPrice: number;
  gst: number;
  platformFee: number;
  discount: number;
  couponCode?: string;
  grandTotal: number;
}

/**
 * GST_PERCENT and PLATFORM_FEE_PERCENT are simple flat rates, not India's actual tiered
 * hotel-GST slab (which has historically varied by room tariff and has changed more than
 * once). Confirm the real applicable rate with an accountant before this handles real
 * money — this default exists so the flow works end-to-end, not as tax guidance.
 */
export const calculatePricing = async (
  roomPricePerNight: number,
  nights: number,
  couponCode: string | undefined,
  customerId: string
): Promise<PricingBreakdown> => {
  const roomPrice = roomPricePerNight * nights;
  const gst = Math.round((roomPrice * env.GST_PERCENT) / 100);
  const platformFee = Math.round((roomPrice * env.PLATFORM_FEE_PERCENT) / 100);

  let discount = 0;
  let appliedCouponCode: string | undefined;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!coupon) throw new ApiError(400, 'This coupon code is not valid.');
    if (coupon.expiryDate < new Date()) throw new ApiError(400, 'This coupon has expired.');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new ApiError(400, 'This coupon has reached its usage limit.');
    }
    if (roomPrice < coupon.minBookingAmount) {
      throw new ApiError(400, `This coupon needs a minimum booking of Rs. ${coupon.minBookingAmount}.`);
    }
    if (coupon.usageLimitPerUser) {
      const timesUsedByCustomer = await Booking.countDocuments({
        customer: customerId,
        'pricing.couponCode': coupon.code,
        status: { $ne: 'cancelled' },
      });
      if (timesUsedByCustomer >= coupon.usageLimitPerUser) {
        throw new ApiError(400, "You've already used this coupon the maximum number of times.");
      }
    }

    discount = coupon.type === 'flat' ? coupon.value : Math.round((roomPrice * coupon.value) / 100);
    if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
    discount = Math.min(discount, roomPrice); // never discount past zero

    appliedCouponCode = coupon.code;
  }

  const grandTotal = roomPrice + gst + platformFee - discount;

  return { roomPrice, gst, platformFee, discount, couponCode: appliedCouponCode, grandTotal };
};

/** Called only once a booking is actually confirmed — never on order-creation, before payment. */
export const recordCouponUsage = async (couponCode?: string): Promise<void> => {
  if (!couponCode) return;
  await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: 1 } });
};
