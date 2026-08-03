import type { HotelDTO, RoomDTO } from '../types';

/**
 * Builds a schema.org LodgingBusiness JSON-LD object for a hotel details page. Usage once the
 * frontend exists: JSON.stringify(hotelJsonLd(hotel, rooms)) inside a
 * <script type="application/ld+json"> tag on that page.
 */
export const hotelJsonLd = (hotel: HotelDTO, rooms: RoomDTO[]): Record<string, unknown> => {
  const prices = rooms.map((r) => r.price.discounted ?? r.price.base).filter((p) => p > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: hotel.name,
    description: hotel.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: hotel.city,
      addressRegion: hotel.state,
      addressCountry: 'IN',
    },
    ...(hotel.rating.count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: hotel.rating.average,
        reviewCount: hotel.rating.count,
      },
    }),
    ...(hotel.images.length > 0 && { image: hotel.images }),
    ...(prices.length > 0 && { priceRange: `₹${Math.min(...prices)}+` }),
  };
};

/** Basic BreadcrumbList JSON-LD, e.g. Home > Deoghar > Hotel Name. */
export const breadcrumbJsonLd = (crumbs: { name: string; url: string }[]): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: crumb.url,
  })),
});
