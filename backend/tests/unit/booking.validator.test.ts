import { createOrderSchema } from '../../src/validators/booking.validator';

describe('booking validators', () => {
  describe('createOrderSchema', () => {
    it('accepts a valid order request', () => {
      const result = createOrderSchema.safeParse({
        roomId: '507f1f77bcf86cd799439011',
        checkIn: '2026-09-01',
        checkOut: '2026-09-03',
        adults: '2', // form fields arrive as strings — coerce() should turn this into a number
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.adults).toBe(2);
    });

    it('rejects zero adults', () => {
      const result = createOrderSchema.safeParse({
        roomId: '507f1f77bcf86cd799439011',
        checkIn: '2026-09-01',
        checkOut: '2026-09-03',
        adults: '0',
      });
      expect(result.success).toBe(false);
    });

    it('defaults children to 0 when omitted', () => {
      const result = createOrderSchema.safeParse({
        roomId: '507f1f77bcf86cd799439011',
        checkIn: '2026-09-01',
        checkOut: '2026-09-03',
        adults: '1',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.children).toBe(0);
    });

    it('rejects a missing roomId', () => {
      const result = createOrderSchema.safeParse({ checkIn: '2026-09-01', checkOut: '2026-09-03', adults: '1' });
      expect(result.success).toBe(false);
    });
  });
});
