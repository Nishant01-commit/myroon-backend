import { Request, Response } from 'express';
import User from '../models/User';
import { ApiError, ApiResponse, catchAsync } from '../utils/apiHelpers';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateRawToken, hashToken } from '../utils/tokens';
import { sendEmail } from '../services/email.service';
import { verificationEmail, passwordResetEmail } from '../templates/authEmails';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';

const REFRESH_COOKIE_NAME = 'myroomm_refresh_token';
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * myroomm.in (Hostinger) and the API (Render) are different domains, so this
 * is a cross-site cookie by construction. In production that requires
 * SameSite=None + Secure for the browser to send it back to the API at all.
 * Locally this means the frontend dev server should proxy /api requests to
 * the backend (e.g. Next.js rewrites) so the browser sees same-origin
 * requests instead — wired up when the frontend is scaffolded in Phase 3.
 */
const cookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: REFRESH_COOKIE_MAX_AGE,
});

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions());
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions());
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, phone, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  const rawToken = generateRawToken();
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    emailVerificationToken: hashToken(rawToken),
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const verifyUrl = `${env.CLIENT_URL}/verify-email/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your MyRoomm account',
    html: verificationEmail(user.name, verifyUrl),
    template: 'email_verification',
  });

  return ApiResponse.success(
    res,
    { id: user.id, name: user.name, email: user.email, role: user.role },
    'Registered — check your email to verify your account.',
    201
  );
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const hashed = hashToken(req.params.token);
  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) throw new ApiError(400, 'This verification link is invalid or has expired.');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return ApiResponse.success(res, null, 'Email verified — you can now log in.');
});

export const resendVerification = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Same response whether or not the account exists, so this can't be used to find registered emails.
  if (!user || user.isEmailVerified) {
    return ApiResponse.success(res, null, 'If that account needs verifying, a new email is on its way.');
  }

  const rawToken = generateRawToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const verifyUrl = `${env.CLIENT_URL}/verify-email/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your MyRoomm account',
    html: verificationEmail(user.name, verifyUrl),
    template: 'email_verification',
  });

  return ApiResponse.success(res, null, 'If that account needs verifying, a new email is on its way.');
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email or password.');
  }
  if (!user.isActive || user.isSuspended) {
    throw new ApiError(403, 'This account is no longer active.');
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshTokens.push({
    token: hashToken(refreshToken),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE),
    userAgent: req.headers['user-agent'],
  });
  await user.save();

  setRefreshCookie(res, refreshToken);

  return ApiResponse.success(
    res,
    {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified },
    },
    'Logged in.'
  );
});

export const refreshAccessToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw new ApiError(401, 'No refresh token provided.');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired session. Please log in again.');
  }

  const hashed = hashToken(token);
  const user = await User.findOne({ _id: decoded.userId, 'refreshTokens.token': hashed });
  if (!user) throw new ApiError(401, 'Invalid or expired session. Please log in again.');

  // Rotate on every use: drop the token that was just spent, issue a new pair.
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== hashed);

  const payload = { userId: user.id, role: user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  user.refreshTokens.push({
    token: hashToken(newRefreshToken),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE),
    userAgent: req.headers['user-agent'],
  });
  await user.save();

  setRefreshCookie(res, newRefreshToken);

  return ApiResponse.success(res, { accessToken: newAccessToken }, 'Session refreshed.');
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    const hashed = hashToken(token);
    await User.updateOne({ 'refreshTokens.token': hashed }, { $pull: { refreshTokens: { token: hashed } } });
  }
  clearRefreshCookie(res);
  return ApiResponse.success(res, null, 'Logged out.');
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return ApiResponse.success(res, null, 'If that email is registered, a reset link is on its way.');
  }

  const rawToken = generateRawToken();
  user.passwordResetToken = hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${env.CLIENT_URL}/reset-password/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your MyRoomm password',
    html: passwordResetEmail(user.name, resetUrl),
    template: 'password_reset',
  });

  return ApiResponse.success(res, null, 'If that email is registered, a reset link is on its way.');
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const hashed = hashToken(req.params.token);
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired.');

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // Invalidate every existing session for security.
  await user.save();

  return ApiResponse.success(res, null, 'Password updated — please log in again.');
});

export const getMe = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) throw new ApiError(404, 'User not found.');

  return ApiResponse.success(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    profilePhoto: user.profilePhoto,
  });
});
