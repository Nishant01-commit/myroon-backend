import { Request, Response, NextFunction, RequestHandler } from 'express';

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ApiResponse {
  static success(res: Response, data: unknown, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
  }

  static error(res: Response, message = 'Something went wrong', statusCode = 500) {
    return res.status(statusCode).json({ success: false, message });
  }
}

/** Wraps an async route handler so rejected promises reach the central error handler. */
export const catchAsync =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
