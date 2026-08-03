import { Router } from 'express';
import {
  searchHotels,
  getHotelBySlug,
  createHotel,
  getMyHotels,
  updateHotel,
  listPendingHotels,
  approveHotel,
  rejectHotel,
  suspendHotel,
} from '../controllers/hotel.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parseJsonFields } from '../middleware/parseJsonFields';
import { createHotelSchema, updateHotelSchema } from '../validators/hotel.validator';
import { imageUpload } from '../middleware/upload';
import roomRouter from './room.routes';

const router = Router();

const HOTEL_JSON_FIELDS = ['address', 'coordinates', 'amenities', 'nearbyPlaces'];

/**
 * @openapi
 * /hotels:
 *   get:
 *     summary: Search approved hotels by city, guests, amenities, price range; sort and paginate
 *     tags: [Hotels]
 */
router.get('/', searchHotels);

router.get('/my/hotels', protect, authorize('hotel_owner', 'admin'), getMyHotels);

/**
 * @openapi
 * /hotels:
 *   post:
 *     summary: Submit a new hotel for admin review (multipart/form-data, images required)
 *     tags: [Hotels]
 */
router.post(
  '/',
  protect,
  authorize('hotel_owner'),
  imageUpload.array('images', 10),
  parseJsonFields(HOTEL_JSON_FIELDS),
  validate(createHotelSchema),
  createHotel
);

router.patch(
  '/:id',
  protect,
  authorize('hotel_owner', 'admin'),
  imageUpload.array('images', 10),
  parseJsonFields(HOTEL_JSON_FIELDS),
  validate(updateHotelSchema),
  updateHotel
);

// Admin — approval workflow
router.get('/admin/pending', protect, authorize('admin'), listPendingHotels);
router.patch('/:id/approve', protect, authorize('admin'), approveHotel);
router.patch('/:id/reject', protect, authorize('admin'), rejectHotel);
router.patch('/:id/suspend', protect, authorize('admin'), suspendHotel);

// Rooms, nested under their hotel
router.use('/:hotelId/rooms', roomRouter);

// Public hotel details — kept last since /:slug is a single-segment catch-all
router.get('/:slug', getHotelBySlug);

export default router;
