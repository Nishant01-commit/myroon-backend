/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hostinger has no Node.js runtime — this produces plain HTML/CSS/JS in out/ that any
  // static host can serve. See frontend/README.md for what that trades away.
  output: 'export',
  images: {
    loader: 'custom',
    loaderFile: './src/lib/cloudinaryLoader.ts',
  },
  // Each route exports as a folder with an index.html (e.g. /about/index.html) rather than a
  // flat about.html — Hostinger's default Apache config serves that shape without needing a
  // custom rewrite rule.
  trailingSlash: true,
};

module.exports = nextConfig;
