import multer from 'multer';
import { ApiError } from '../utils/apiHelpers';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Buffers files in memory rather than writing to disk — fine at this scale,
 * and simpler, since every upload immediately streams on to Cloudinary and
 * nothing needs to persist locally in between.
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG, PNG, or WebP images are allowed.'));
    }
    cb(null, true);
  },
});
