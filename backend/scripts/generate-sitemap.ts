/**
 * Regenerates frontend/public/sitemap.xml from live data: static pages plus every approved
 * hotel and the cities they're in. The Phase 1 sitemap was a hand-written placeholder; this
 * is what keeps it accurate once hotels start getting approved.
 *
 * Run manually with `npm run generate-sitemap`, or wire it into a scheduled GitHub Action /
 * pre-build step once the frontend exists and gets rebuilt on a schedule — static export has
 * no request-time rendering, so this has to run at build time, not per-visit.
 */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import Hotel from '../src/models/Hotel';

const SITE_URL = 'https://myroomm.in';

const STATIC_PAGES: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/hotels', changefreq: 'daily', priority: '0.9' },
  { path: '/become-a-partner', changefreq: 'monthly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/cancellation-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/refund-policy', changefreq: 'yearly', priority: '0.3' },
];

const urlEntry = (loc: string, changefreq: string, priority: string, lastmod?: string): string => `
  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

const generateSitemap = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set — cannot query hotels for the sitemap.');

  await mongoose.connect(mongoUri);

  const hotels = await Hotel.find({ status: 'approved' }).select('slug address updatedAt').lean();
  const cities = [...new Set(hotels.map((h) => h.address.city))];

  const staticUrls = STATIC_PAGES.map((p) => urlEntry(`${SITE_URL}${p.path}`, p.changefreq, p.priority));
  const cityUrls = cities.map((city) => urlEntry(`${SITE_URL}/hotels?city=${encodeURIComponent(city)}`, 'daily', '0.9'));
  const hotelUrls = hotels.map((h) =>
    urlEntry(`${SITE_URL}/hotels/${h.slug}`, 'weekly', '0.8', h.updatedAt?.toISOString().split('T')[0])
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticUrls, ...cityUrls, ...hotelUrls].join('')}
</urlset>
`;

  const outputPath = path.join(__dirname, '../../frontend/public/sitemap.xml');
  fs.writeFileSync(outputPath, xml);
  // eslint-disable-next-line no-console
  console.log(`Sitemap written to ${outputPath} — ${hotels.length} hotels across ${cities.length} cities.`);

  await mongoose.disconnect();
};

generateSitemap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Sitemap generation failed:', err);
  process.exit(1);
});
