import cloudinary from '../config/cloudinary';
import { ApiError } from '../utils/apiHelpers';

export interface UploadedImage {
  url: string;
  publicId: string;
}

const uploadBufferToCloudinary = (buffer: Buffer, folder: string): Promise<UploadedImage> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: `myroomm/${folder}`, resource_type: 'image' }, (error, result) => {
      if (error || !result) return reject(new ApiError(502, 'Image upload failed. Please try again.'));
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
};

export const uploadImages = (files: Express.Multer.File[], folder: string): Promise<UploadedImage[]> =>
  Promise.all(files.map((file) => uploadBufferToCloudinary(file.buffer, folder)));

export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Non-fatal — an orphaned Cloudinary asset isn't worth failing the request over.
  }
};
