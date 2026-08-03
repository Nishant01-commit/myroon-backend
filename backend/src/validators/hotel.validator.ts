import { z } from 'zod';
import { HOTEL_AMENITIES } from '../constants/amenities';

const addressSchema = z.object({
  street: z.string().trim().min(1, 'Street address is required'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode: z.string().trim().min(1, 'Pincode is required'),
  country: z.string().trim().default('India'),
});

// [longitude, latitude], per GeoJSON convention (matches Hotel.location.coordinates)
const coordinatesSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

const nearbyPlaceSchema = z.object({
  name: z.string().trim().min(1),
  distanceKm: z.number().min(0),
});

export const createHotelSchema = z.object({
  name: z.string().trim().min(3, 'Hotel name must be at least 3 characters').max(150),
  description: z.string().trim().min(20, 'Description must be at least 20 characters'),
  address: addressSchema,
  coordinates: coordinatesSchema,
  amenities: z.array(z.enum(HOTEL_AMENITIES)).default([]),
  contactNumber: z.string().trim().min(6, 'Enter a valid contact number'),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
  gstNumber: z.string().trim().optional(),
  checkInTime: z.string().trim().default('12:00'),
  checkOutTime: z.string().trim().default('10:00'),
  cancellationPolicy: z.string().trim().min(10, 'Describe the cancellation policy'),
  houseRules: z.string().trim().optional(),
  nearbyPlaces: z.array(nearbyPlaceSchema).default([]),
});

export const updateHotelSchema = createHotelSchema.partial();
