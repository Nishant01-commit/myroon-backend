import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export type UserRole = 'customer' | 'hotel_owner' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  profilePhoto?: { url: string; publicId: string };
  address?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshTokens: { token: string; createdAt: Date; expiresAt: Date; userAgent?: string }[];
  wishlist: Types.ObjectId[];
  isActive: boolean;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['customer', 'hotel_owner', 'admin'], default: 'customer' },
    profilePhoto: { url: String, publicId: String },
    address: { type: String, trim: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    refreshTokens: [
      {
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        userAgent: String,
      },
    ],
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Hotel' }],
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
