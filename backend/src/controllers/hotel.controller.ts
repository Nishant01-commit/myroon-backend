import { Request, Response } from 'express';
import Hotel from '../models/Hotel';
import Room from '../models/Room';
import AuditLog from '../models/AuditLog';
import { ApiError, ApiResponse, catchAsync } from '../utils/apiHelpers';
import { escapeRegex } from '../utils/escapeRegex';
import { AuthRequest } from '../middleware/auth';
import { uploadImages } from '../services/upload.service';
import { generateUniqueSlug } from '../services/hotel.service';
import { createNotification } from '../services/notification.service';

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Filtering/sorting/pagination is done in plain JS after two batched queries
 * (hotels, then their rooms), rather than a single MongoDB aggregation
 * pipeline. At Deoghar-launch scale this is trivial for Node to handle in
 * memory, and it's far easier to verify correct than a hand-rolled
 * aggregation — worth revisiting with a proper pipeline (or Atlas Search)
 * once the hotel count is large enough for it to matter.
 */
export const searchHotels = catchAsync(async (req: Request, res: Response) => {
  const {
    city,
    guests,
    checkIn,
    checkOut,
    amenities,
    minPrice,
    maxPrice,
    sort = 'newest',
    page = '1',
    limit = '12',
  } = req.query as Record<string, string>;

  if (checkIn && checkOut) {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime()) || outDate <= inDate) {
      throw new ApiError(400, 'Provide a valid check-in and check-out date, with check-out after check-in.');
    }
    // Not used to exclude anything yet — there are no Bookings until Phase 4, so every
    // approved hotel is trivially "available" for any date range right now. Once bookings
    // exist, this needs to exclude rooms with an overlapping confirmed booking for these dates.
  }

  const filter: Record<string, unknown> = { status: 'approved' };
  if (city) filter['address.city'] = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (amenities) {
    const list = amenities.split(',').map((a) => a.trim()).filter(Boolean);
    if (list.length) filter.amenities = { $all: list };
  }

  const hotels = await Hotel.find(filter).lean();
  const hotelIds = hotels.map((h) => h._id);

  const roomFilter: Record<string, unknown> = { hotel: { $in: hotelIds }, isActive: true };
  const requestedGuests = guests ? parseInt(guests, 10) : undefined;
  if (requestedGuests) roomFilter['capacity.adults'] = { $gte: requestedGuests };

  const rooms = await Room.find(roomFilter).lean();
  const roomsByHotel = new Map<string, typeof rooms>();
  for (const room of rooms) {
    const key = String(room.hotel);
    if (!roomsByHotel.has(key)) roomsByHotel.set(key, []);
    roomsByHotel.get(key)!.push(room);
  }

  const minPriceNum = minPrice ? Number(minPrice) : undefined;
  const maxPriceNum = maxPrice ? Number(maxPrice) : undefined;

  type Scored = (typeof hotels)[number] & { startingPrice: number | null; roomCount: number };

  let results: Scored[] = hotels
    .map((hotel) => {
      const hotelRooms = roomsByHotel.get(String(hotel._id)) ?? [];
      const prices = hotelRooms.map((r) => r.price.discounted ?? r.price.base);
      const startingPrice = prices.length ? Math.min(...prices) : null;
      return { ...hotel, startingPrice, roomCount: hotelRooms.length };
    })
    // A hotel only qualifies if it has a room at all — and, when `guests` was given,
    // that's already restricted to rooms meeting that capacity via roomFilter above.
    .filter((h) => h.roomCount > 0);

  if (minPriceNum !== undefined) results = results.filter((h) => h.startingPrice !== null && h.startingPrice >= minPriceNum);
  if (maxPriceNum !== undefined) results = results.filter((h) => h.startingPrice !== null && h.startingPrice <= maxPriceNum);

  const sorters: Record<string, (a: Scored, b: Scored) => number> = {
    price_asc: (a, b) => (a.startingPrice ?? Infinity) - (b.startingPrice ?? Infinity),
    price_desc: (a, b) => (b.startingPrice ?? -Infinity) - (a.startingPrice ?? -Infinity),
    rating: (a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0),
    popularity: (a, b) => (b.rating?.count ?? 0) - (a.rating?.count ?? 0),
    newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  };
  results.sort(sorters[sort] ?? sorters.newest);

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const total = results.length;
  const paged = results.slice((pageNum - 1) * limitNum, (pageNum - 1) * limitNum + limitNum);

  return ApiResponse.success(res, {
    hotels: paged,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

export const getHotelBySlug = catchAsync(async (req: Request, res: Response) => {
  const hotel = await Hotel.findOne({ slug: req.params.slug, status: 'approved' }).lean();
  if (!hotel) throw new ApiError(404, 'Hotel not found.');

  const rooms = await Room.find({ hotel: hotel._id, isActive: true }).lean();

  return ApiResponse.success(res, { ...hotel, rooms });
});

// ---------------------------------------------------------------------------
// Hotel owner
// ---------------------------------------------------------------------------

export const createHotel = catchAsync(async (req: AuthRequest, res: Response) => {
  const body = req.body;
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) throw new ApiError(400, 'At least one hotel image is required.');

  const [slug, images] = await Promise.all([generateUniqueSlug(body.name), uploadImages(files, 'hotels')]);

  const hotel = await Hotel.create({
    owner: req.user!.userId,
    name: body.name,
    slug,
    description: body.description,
    address: body.address,
    location: { type: 'Point', coordinates: body.coordinates },
    amenities: body.amenities,
    images,
    contactNumber: body.contactNumber,
    contactEmail: body.contactEmail,
    gstNumber: body.gstNumber,
    policies: {
      checkInTime: body.checkInTime,
      checkOutTime: body.checkOutTime,
      cancellationPolicy: body.cancellationPolicy,
      houseRules: body.houseRules,
    },
    nearbyPlaces: body.nearbyPlaces,
  });

  return ApiResponse.success(res, hotel, 'Hotel submitted for review — an admin will approve it before it goes live.', 201);
});

export const getMyHotels = catchAsync(async (req: AuthRequest, res: Response) => {
  const hotels = await Hotel.find({ owner: req.user!.userId }).sort({ createdAt: -1 });
  return ApiResponse.success(res, hotels);
});

export const updateHotel = catchAsync(async (req: AuthRequest, res: Response) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw new ApiError(404, 'Hotel not found.');
  if (String(hotel.owner) !== req.user!.userId && req.user!.role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to edit this hotel.');
  }

  const body = req.body;
  const files = (req.files as Express.Multer.File[]) || [];

  // NOTE: changing the name changes the public slug/URL. Fine for an MVP; a redirect from
  // the old slug (or making the slug immutable after first approval) is a Phase 6 SEO nicety.
  if (body.name && body.name !== hotel.name) {
    hotel.slug = await generateUniqueSlug(body.name, hotel.id);
    hotel.name = body.name;
  }
  if (body.description) hotel.description = body.description;
  if (body.address) hotel.address = { ...hotel.address, ...body.address };
  if (body.coordinates) hotel.location = { type: 'Point', coordinates: body.coordinates };
  if (body.amenities) hotel.amenities = body.amenities;
  if (body.contactNumber) hotel.contactNumber = body.contactNumber;
  if (body.contactEmail) hotel.contactEmail = body.contactEmail;
  if (body.gstNumber) hotel.gstNumber = body.gstNumber;
  if (body.checkInTime) hotel.policies.checkInTime = body.checkInTime;
  if (body.checkOutTime) hotel.policies.checkOutTime = body.checkOutTime;
  if (body.cancellationPolicy) hotel.policies.cancellationPolicy = body.cancellationPolicy;
  if (body.houseRules) hotel.policies.houseRules = body.houseRules;
  if (body.nearbyPlaces) hotel.nearbyPlaces = body.nearbyPlaces;

  if (files.length > 0) {
    const newImages = await uploadImages(files, 'hotels');
    hotel.images.push(...newImages);
  }

  await hotel.save();
  return ApiResponse.success(res, hotel, 'Hotel updated.');
});

// ---------------------------------------------------------------------------
// Admin — approval workflow
// ---------------------------------------------------------------------------

export const listPendingHotels = catchAsync(async (req: AuthRequest, res: Response) => {
  const hotels = await Hotel.find({ status: 'pending' }).sort({ createdAt: 1 }).populate('owner', 'name email phone');
  return ApiResponse.success(res, hotels);
});

export const approveHotel = catchAsync(async (req: AuthRequest, res: Response) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw new ApiError(404, 'Hotel not found.');

  hotel.status = 'approved';
  hotel.rejectionReason = undefined;
  await hotel.save();

  await AuditLog.create({
    actor: req.user!.userId,
    action: 'HOTEL_APPROVED',
    targetType: 'Hotel',
    targetId: hotel._id,
    ipAddress: req.ip,
  });

  await createNotification({
    user: String(hotel.owner),
    type: 'hotel_approval',
    title: 'Hotel approved!',
    message: `${hotel.name} is now live on MyRoomm.in.`,
  });

  return ApiResponse.success(res, hotel, 'Hotel approved and now public.');
});

export const rejectHotel = catchAsync(async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, 'A rejection reason is required.');

  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw new ApiError(404, 'Hotel not found.');

  hotel.status = 'rejected';
  hotel.rejectionReason = reason;
  await hotel.save();

  await AuditLog.create({
    actor: req.user!.userId,
    action: 'HOTEL_REJECTED',
    targetType: 'Hotel',
    targetId: hotel._id,
    metadata: { reason },
    ipAddress: req.ip,
  });

  await createNotification({
    user: String(hotel.owner),
    type: 'hotel_approval',
    title: 'Hotel listing needs changes',
    message: `${hotel.name} wasn't approved: ${reason}`,
  });

  return ApiResponse.success(res, hotel, 'Hotel rejected.');
});

export const suspendHotel = catchAsync(async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw new ApiError(404, 'Hotel not found.');
  if (hotel.status !== 'approved') throw new ApiError(400, 'Only approved hotels can be suspended.');

  hotel.status = 'suspended';
  await hotel.save();

  await AuditLog.create({
    actor: req.user!.userId,
    action: 'HOTEL_SUSPENDED',
    targetType: 'Hotel',
    targetId: hotel._id,
    metadata: { reason },
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, hotel, 'Hotel suspended and removed from public listing.');
});
