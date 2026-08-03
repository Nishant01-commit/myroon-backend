# MyRoomm.in — Frontend

Next.js 15 (App Router), built as a static export for Hostinger. The homepage is real and functional; search results, hotel details, the booking flow, and the dashboards are still ahead.

## What's built

- **Design system** — Tailwind theme (`tailwind.config.ts`) carrying the brief's royal blue / gold / white / soft gray palette as CSS variables, Fraunces (display) + Work Sans (body) via `next/font`, two shadcn-style primitives (`Button`, `Input`) with `components.json` in place so the real shadcn CLI recognizes the project once you have network access to run it.
- **Homepage** (`src/app/page.tsx`) — hero with the required headline and devotional tagline, the search box, "Why Choose Us," Popular Destinations (Deoghar, with a "more cities" teaser), Featured Hotels (fetches live from `GET /api/v1/hotels`, with a skeleton loading state and an empty state that doubles as an owner-acquisition CTA), and a Testimonials carousel (Swiper — placeholder copy until Phase 5's review system has real data).
- **API client** (`src/lib/api.ts`) — axios wired to the backend's actual auth pattern: access token in memory, httpOnly refresh cookie sent via `withCredentials`, one automatic retry-after-refresh on a 401.
- **Image handling** (`src/lib/cloudinaryLoader.ts`) — a custom `next/image` loader, since there's no server here to run Next's built-in optimizer; Cloudinary does the resizing via URL params instead.
- **Header/Footer** — footer matches the spec's link list (About, Privacy Policy, Terms, Cancellation Policy, Refund Policy, Contact, social icons, newsletter — the newsletter form is a placeholder toast, since there's no backend endpoint for it yet).
- `public/robots.txt` and `public/sitemap.xml` — ready for Search Console now; `sitemap.xml` gets regenerated for real by `backend/scripts/generate-sitemap.ts` once hotels exist.

## Not built yet

Search results page, hotel details page, login/register pages, the booking flow (Razorpay checkout), and the customer/owner/admin dashboards. All of the backend for these already exists (Phases 2-5) — this is purely the UI layer catching up.

## Hosting: static export on Hostinger

myroomm.in has no Node.js runtime. That shapes everything above:

- `next.config.js` uses `output: 'export'` — the build produces plain HTML/CSS/JS that Hostinger can serve with no server process.
- No Server Components fetching data at request time, no ISR, no middleware — everything is pre-rendered at build time. All dynamic content (search results, hotel pages, dashboards, booking flow) fetches from the Express API **client-side** after the page loads, using TanStack Query — see `FeaturedHotels.tsx` for the pattern the rest of the dynamic pages will follow.
- Route protection (redirecting a signed-out user away from `/dashboard`) will happen client-side, as a UX nicety — the real security boundary stays server-side, in the `protect`/`authorize` middleware already built on the API.
- The known tradeoff: search engines see a mostly-empty shell before the client-side JS runs and fetches real content, which is weaker for SEO than server rendering would be. Workable, not ideal — most crawlers do execute JS now, and the fetched content still gets indexed, just not as reliably or as fast as pre-rendered HTML.

## Running this locally

```bash
cd frontend
cp .env.local.example .env.local   # points at http://localhost:5000/api/v1 by default
npm install
npm run dev
```

Needs the backend running too (`cd ../backend && npm run dev`) for anything beyond the static shell to actually load data. Same caveat as the backend: this has never been through `npm install` — see the root `TESTING.md` for the backend's version of this checklist; the frontend hasn't had one written yet.

