import { Response } from 'express';
import Hotel from '../models/Hotel';
import Room from '../models/Room';
import { ApiError, ApiResponse, catchAsync } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';
import { uploadImages } from '../services/upload.service';

/** A room's permissions always follow its hotel's owner — there's no separate room-level ownership. */
const assertOwnsHotel = async (hotelId: string, userId: string, role: string) => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(404, 'Hotel not found.');
  if (String(hotel.owner) !== userId && role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to manage rooms for this hotel.');
  }
  return hotel;
};

export const createRoom = catchAsync(async (req: AuthRequest, res: Response) => {
  const { hotelId } = req.params;
  await assertOwnsHotel(hotelId, req.user!.userId, req.user!.role);

  const body = req.body;
  const files = (req.files as Express.Multer.File[]) || [];
  const photos = files.length ? await uploadImages(files, 'rooms') : [];

  const room = await Room.create({
    hotel: hotelId,
    name: body.name,
    type: body.type,
    capacity: { adults: body.adults, children: body.children },
    price: { base: body.basePrice, discounted: body.discountedPrice },
    totalRooms: body.totalRooms,
    amenities: body.amenities,
    photos,
  });

  return ApiResponse.success(res, room, 'Room added.', 201);
});

export const listHotelRooms = catchAsync(async (req: AuthRequest, res: Response) => {
  const { hotelId } = req.params;
  await assertOwnsHotel(hotelId, req.user!.userId, req.user!.role);

  const rooms = await Room.find({ hotel: hotelId }).sort({ createdAt: -1 });
  return ApiResponse.success(res, rooms);
});

export const updateRoom = catchAsync(async (req: AuthRequest, res: Response) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found.');
  await assertOwnsHotel(String(room.hotel), req.user!.userId, req.user!.role);

  const body = req.body;
  const files = (req.files as Express.Multer.File[]) || [];

  if (body.name) room.name = body.name;
  if (body.type) room.type = body.type;
  if (body.adults !== undefined) room.capacity.adults = body.adults;
  if (body.children !== undefined) room.capacity.children = body.children;
  if (body.basePrice !== undefined) room.price.base = body.basePrice;
  if (body.discountedPrice !== undefined) room.price.discounted = body.discountedPrice;
  if (body.totalRooms !== undefined) room.totalRooms = body.totalRooms;
  if (body.amenities) room.amenities = body.amenities;
  if (body.isActive !== undefined) room.isActive = body.isActive;

  if (files.length > 0) {
    const newPhotos = await uploadImages(files, 'rooms');
    room.photos.push(...newPhotos);
  }

  await room.save();
  return ApiResponse.success(res, room, 'Room updated.');
});

/** Soft delete — a room can be referenced by past Bookings, so it's deactivated, never hard-deleted. */
export const deactivateRoom = catchAsync(async (req: AuthRequest, res: Response) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found.');
  await assertOwnsHotel(String(room.hotel), req.user!.userId, req.user!.role);

  room.isActive = false;
  await room.save();
  return ApiResponse.success(res, room, 'Room deactivated.');
});
