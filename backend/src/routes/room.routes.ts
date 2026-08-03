import { Router } from 'express';
import { createRoom, listHotelRooms, updateRoom, deactivateRoom } from '../controllers/room.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parseJsonFields } from '../middleware/parseJsonFields';
import { createRoomSchema, updateRoomSchema } from '../validators/room.validator';
import { imageUpload } from '../middleware/upload';

const router = Router({ mergeParams: true });

const ROOM_JSON_FIELDS = ['amenities'];

/**
 * @openapi
 * /hotels/{hotelId}/rooms:
 *   get:
 *     summary: List rooms for a hotel (owner of that hotel, or admin)
 *     tags: [Rooms]
 *   post:
 *     summary: Add a room to a hotel — multipart/form-data with optional photos
 *     tags: [Rooms]
 */
router.get('/', protect, authorize('hotel_owner', 'admin'), listHotelRooms);

router.post(
  '/',
  protect,
  authorize('hotel_owner', 'admin'),
  imageUpload.array('photos', 10),
  parseJsonFields(ROOM_JSON_FIELDS),
  validate(createRoomSchema),
  createRoom
);

/**
 * @openapi
 * /hotels/{hotelId}/rooms/{id}:
 *   patch:
 *     summary: Update a room
 *     tags: [Rooms]
 *   delete:
 *     summary: Deactivate a room (soft delete — a room may be referenced by past bookings)
 *     tags: [Rooms]
 */
router.patch(
  '/:id',
  protect,
  authorize('hotel_owner', 'admin'),
  imageUpload.array('photos', 10),
  parseJsonFields(ROOM_JSON_FIELDS),
  validate(updateRoomSchema),
  updateRoom
);

router.delete('/:id', protect, authorize('hotel_owner', 'admin'), deactivateRoom);

export default router;
