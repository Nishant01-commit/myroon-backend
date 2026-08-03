import { wrapper } from './emailLayout';

export const verificationEmail = (name: string, verifyUrl: string): string =>
  wrapper(`
    <h2 style="color:#1e3a8a;margin-top:0;">Welcome, ${name}!</h2>
    <p>Thanks for signing up for MyRoomm. Please confirm your email address to activate your account.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${verifyUrl}" style="background:#d4af37;color:#1e3a8a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Verify Email</a>
    </p>
    <p style="color:#6b7280;font-size:13px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
  `);

export const passwordResetEmail = (name: string, resetUrl: string): string =>
  wrapper(`
    <h2 style="color:#1e3a8a;margin-top:0;">Hi ${name},</h2>
    <p>We received a request to reset your MyRoomm password. Click below to choose a new one.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="background:#d4af37;color:#1e3a8a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
    </p>
    <p style="color:#6b7280;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  `);
