import Hotel from '../models/Hotel';

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Appends -1, -2, ... until the slug is unique. Pass excludeHotelId when editing a hotel in place. */
export const generateUniqueSlug = async (name: string, excludeHotelId?: string): Promise<string> => {
  const base = slugify(name) || 'hotel';
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await Hotel.exists({ slug, ...(excludeHotelId && { _id: { $ne: excludeHotelId } }) })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
};
