import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiHelpers';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

export const errorHandler = (err: Error | ApiError, req: Request, res: Response, next: NextFunction) => {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') statusCode = 400;
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier provided.';
  }
  if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    message = 'Duplicate value — this record already exists.';
  }
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired, please log in again.';
  }

  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);
  if (env.NODE_ENV !== 'production' && !(err instanceof ApiError && err.isOperational)) {
    logger.error(err.stack || '');
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
