/**
 * The fixed vocabulary for hotel-level amenities. Kept as an enum (rather
 * than free text) specifically so the search filters in hotel.controller.ts
 * always match what owners actually set — free text would let "Pool" and
 * "swimming pool" silently fail to match each other.
 */
export const HOTEL_AMENITIES = [
  'ac',
  'wifi',
  'parking',
  'breakfast',
  'swimming_pool',
  'free_cancellation',
  'couple_friendly',
  'family_friendly',
  'pet_friendly',
  'restaurant',
] as const;

export type HotelAmenity = (typeof HOTEL_AMENITIES)[number];
