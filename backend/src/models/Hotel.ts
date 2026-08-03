import mongoose, { Schema, Document, Types } from 'mongoose';

export type HotelStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface IHotelImage {
  url: string;
  publicId: string;
}

export interface INearbyPlace {
  name: string;
  distanceKm: number;
}

export interface IHotel extends Document {
  owner: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  address: { street: string; city: string; state: string; pincode: string; country: string };
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  amenities: string[];
  images: IHotelImage[];
  contactNumber: string;
  contactEmail: string;
  gstNumber?: string;
  policies: { checkInTime: string; checkOutTime: string; cancellationPolicy: string; houseRules?: string };
  nearbyPlaces: INearbyPlace[];
  status: HotelStatus;
  rejectionReason?: string;
  rating: { average: number; count: number };
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hotelSchema = new Schema<IHotel>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true, default: 'India' },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    amenities: [{ type: String }],
    images: [{ url: String, publicId: String }],
    contactNumber: { type: String, required: true },
    contactEmail: { type: String, required: true, lowercase: true },
    gstNumber: { type: String },
    policies: {
      checkInTime: { type: String, default: '12:00' },
      checkOutTime: { type: String, default: '10:00' },
      cancellationPolicy: { type: String, required: true },
      houseRules: String,
    },
    nearbyPlaces: [{ name: String, distanceKm: Number }],
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
    rejectionReason: String,
    rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

hotelSchema.index({ location: '2dsphere' });
hotelSchema.index({ 'address.city': 1, status: 1 });
hotelSchema.index({ name: 'text', description: 'text', 'address.city': 'text' });

/**
 * IMPORTANT: status defaults to "pending" — public search/listing queries in
 * Phase 3 must always filter on status: "approved". Nothing here goes live
 * without an explicit admin approval step, per the product spec.
 */

export default mongoose.model<IHotel>('Hotel', hotelSchema);
