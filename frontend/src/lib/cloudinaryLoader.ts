interface LoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudinaryLoader({ src, width, quality }: LoaderParams): string {
  if (src.includes('res.cloudinary.com')) {
    return src.replace('/upload/', `/upload/w_${width},q_${quality ?? 'auto'},f_auto,c_fill/`);
  }
  return src; // local/static assets and any non-Cloudinary URL pass through unchanged
}
