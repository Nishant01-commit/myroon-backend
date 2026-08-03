import { Request, Response, NextFunction } from 'express';

/**
 * Hotel/room creation is multipart/form-data (it carries file uploads
 * alongside form fields), so nested fields like `address` or `amenities`
 * arrive as JSON-encoded strings rather than real objects/arrays. This
 * parses the given field names back into real values before the Zod
 * validator sees them. If a field is already an object (e.g. a pure-JSON
 * request with no files), it's left untouched.
 */
export const parseJsonFields =
  (fields: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      const value = req.body[field];
      if (typeof value === 'string') {
        try {
          req.body[field] = JSON.parse(value);
        } catch {
          // Left as-is — the Zod validator will reject it with a clear message.
        }
      }
    }
    next();
  };
