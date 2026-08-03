// Shared TypeScript types — mirrors of core API entities, safe to import
// from the Next.js frontend. These are plain data shapes as they appear
// over JSON, not Mongoose documents.

export type UserRole = 'customer' | 'hotel_owner' | 'admin';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  profilePhotoUrl?: string;
  isEmailVerified: boolean;
}

export type HotelStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface HotelDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  state: string;
  images: string[];
  amenities: string[];
  rating: { average: number; count: number };
  status: HotelStatus;
  startingPrice?: number;
}

export interface RoomDTO {
  id: string;
  hotelId: string;
  name: string;
  type: string;
  capacity: { adults: number; children: number };
  price: { base: number; discounted?: number };
  photos: string[];
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';

export interface BookingDTO {
  id: string;
  bookingId: string;
  hotel: Pick<HotelDTO, 'id' | 'name' | 'city'>;
  room: Pick<RoomDTO, 'id' | 'name' | 'type'>;
  checkIn: string; // ISO date
  checkOut: string;
  guests: { adults: number; children: number };
  grandTotal: number;
  status: BookingStatus;
}

export interface ApiResponseShape<T> {
  success: boolean;
  message: string;
  data?: T;
}
