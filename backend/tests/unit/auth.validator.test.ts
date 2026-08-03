import { registerSchema, loginSchema } from '../../src/validators/auth.validator';

describe('auth validators', () => {
  describe('registerSchema', () => {
    it('accepts a valid registration payload and lowercases the email', () => {
      const result = registerSchema.safeParse({
        name: 'Ritu Sharma',
        email: 'RITU@Example.com',
        password: 'password123',
        role: 'customer',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.email).toBe('ritu@example.com');
    });

    it('rejects a password under 8 characters', () => {
      const result = registerSchema.safeParse({ name: 'A B', email: 'a@test.com', password: 'short' });
      expect(result.success).toBe(false);
    });

    it('rejects role: admin — nobody can self-register as admin', () => {
      const result = registerSchema.safeParse({
        name: 'Someone',
        email: 'someone@test.com',
        password: 'password123',
        role: 'admin',
      });
      expect(result.success).toBe(false);
    });

    it('defaults role to customer when omitted', () => {
      const result = registerSchema.safeParse({ name: 'A B', email: 'ab@test.com', password: 'password123' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.role).toBe('customer');
    });
  });

  describe('loginSchema', () => {
    it('rejects an invalid email format', () => {
      const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
      expect(result.success).toBe(false);
    });

    it('accepts a valid login payload', () => {
      const result = loginSchema.safeParse({ email: 'user@test.com', password: 'anything' });
      expect(result.success).toBe(true);
    });
  });
});
