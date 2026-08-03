import Coupon from '../../src/models/Coupon';
import User from '../../src/models/User';
import { calculatePricing } from '../../src/services/pricing.service';

describe('pricing.service', () => {
  const createTestUser = async () =>
    User.create({ name: 'Test User', email: `user-${Date.now()}-${Math.random()}@test.com`, password: 'password123' });

  it('calculates room price, GST, and platform fee with no coupon', async () => {
    const user = await createTestUser();
    const pricing = await calculatePricing(1000, 2, undefined, user.id);

    expect(pricing.roomPrice).toBe(2000);
    expect(pricing.gst).toBe(240); // 12% of 2000, the default GST_PERCENT
    expect(pricing.platformFee).toBe(100); // 5% of 2000, the default PLATFORM_FEE_PERCENT
    expect(pricing.discount).toBe(0);
    expect(pricing.grandTotal).toBe(2000 + 240 + 100);
  });

  it('applies a flat coupon discount', async () => {
    const user = await createTestUser();
    await Coupon.create({
      code: 'FLAT200',
      type: 'flat',
      value: 200,
      minBookingAmount: 0,
      expiryDate: new Date(Date.now() + 86400000),
      createdBy: user.id,
    });

    const pricing = await calculatePricing(1000, 1, 'flat200', user.id); // lowercase — code is case-insensitive
    expect(pricing.discount).toBe(200);
    expect(pricing.couponCode).toBe('FLAT200');
  });

  it('caps a percentage coupon at maxDiscountAmount', async () => {
    const user = await createTestUser();
    await Coupon.create({
      code: 'SAVE50',
      type: 'percentage',
      value: 50,
      maxDiscountAmount: 300,
      minBookingAmount: 0,
      expiryDate: new Date(Date.now() + 86400000),
      createdBy: user.id,
    });

    // 50% of 2000 would be 1000, but the cap is 300
    const pricing = await calculatePricing(1000, 2, 'SAVE50', user.id);
    expect(pricing.discount).toBe(300);
  });

  it('rejects an expired coupon', async () => {
    const user = await createTestUser();
    await Coupon.create({
      code: 'EXPIRED',
      type: 'flat',
      value: 100,
      minBookingAmount: 0,
      expiryDate: new Date(Date.now() - 86400000),
      createdBy: user.id,
    });

    await expect(calculatePricing(1000, 1, 'EXPIRED', user.id)).rejects.toThrow('expired');
  });

  it('rejects a coupon below its minimum booking amount', async () => {
    const user = await createTestUser();
    await Coupon.create({
      code: 'BIGSPEND',
      type: 'flat',
      value: 100,
      minBookingAmount: 5000,
      expiryDate: new Date(Date.now() + 86400000),
      createdBy: user.id,
    });

    await expect(calculatePricing(1000, 1, 'BIGSPEND', user.id)).rejects.toThrow('minimum booking');
  });

  it('rejects a coupon that has hit its global usage limit', async () => {
    const user = await createTestUser();
    await Coupon.create({
      code: 'FIRSTFEW',
      type: 'flat',
      value: 50,
      minBookingAmount: 0,
      expiryDate: new Date(Date.now() + 86400000),
      usageLimit: 1,
      usedCount: 1,
      createdBy: user.id,
    });

    await expect(calculatePricing(1000, 1, 'FIRSTFEW', user.id)).rejects.toThrow('usage limit');
  });

  it('never discounts past zero', async () => {
    const user = await createTestUser();
    await Coupon.create({
      code: 'HUGEFLAT',
      type: 'flat',
      value: 10000, // far more than the room price
      minBookingAmount: 0,
      expiryDate: new Date(Date.now() + 86400000),
      createdBy: user.id,
    });

    const pricing = await calculatePricing(1000, 1, 'HUGEFLAT', user.id);
    expect(pricing.discount).toBe(1000); // capped at roomPrice, not the full 10000
    expect(pricing.grandTotal).toBeGreaterThanOrEqual(pricing.gst + pricing.platformFee);
  });
});
