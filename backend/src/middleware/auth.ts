import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/apiHelpers';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

/** Verifies the Bearer access token and confirms the account is still active. */
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : undefined;

    if (!token) {
      throw new ApiError(401, 'Not authenticated. Please log in.');
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive || user.isSuspended) {
      throw new ApiError(401, 'This account is no longer active.');
    }

    req.user = { userId: decoded.userId, role: user.role };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired session. Please log in again.'));
  }
};

/** Restricts a route to the given roles, e.g. authorize('admin'), authorize('hotel_owner', 'admin'). */
export const authorize =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
