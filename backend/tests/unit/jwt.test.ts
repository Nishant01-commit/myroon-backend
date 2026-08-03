import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../src/utils/jwt';

describe('jwt utils', () => {
  const payload = { userId: 'user123', role: 'customer' };

  it('round-trips an access token', () => {
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
  });

  it('round-trips a refresh token', () => {
    const token = generateRefreshToken(payload);
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(payload.userId);
  });

  it('rejects an access token verified with the refresh secret', () => {
    const token = generateAccessToken(payload);
    expect(() => verifyRefreshToken(token)).toThrow();
  });

  it('rejects a refresh token verified with the access secret', () => {
    const token = generateRefreshToken(payload);
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it('rejects a garbage token', () => {
    expect(() => verifyAccessToken('not-a-real-token')).toThrow();
  });
});
