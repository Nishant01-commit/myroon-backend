import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshAccessToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';
import { authLimiter } from '../middleware/rateLimiter';
import { protect } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new customer or hotel owner account
 *     tags: [Auth]
 */
router.post('/register', authLimiter, validate(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in — returns an access token; sets the refresh token as an httpOnly cookie
 *     tags: [Auth]
 */
router.post('/login', authLimiter, validate(loginSchema), login);

router.post('/logout', logout);
router.post('/refresh-token', refreshAccessToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.get('/me', protect, getMe);

export default router;
