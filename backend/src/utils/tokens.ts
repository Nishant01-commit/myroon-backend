import crypto from 'crypto';

/** Raw token — this is what goes in the emailed link. Never stored as-is. */
export const generateRawToken = (): string => crypto.randomBytes(32).toString('hex');

/** SHA-256 hash of the raw token — this is what gets stored in MongoDB. */
export const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
