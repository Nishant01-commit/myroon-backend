# MyRoomm.in — Architecture & Build Roadmap

## What this is

MyRoomm.in is a hotel room booking platform in the vein of Booking.com / Agoda / MakeMyTrip, launching with **Deoghar** as its first city, built so new cities can be added without any architecture changes. Three roles: **customer**, **hotel owner**, and **admin**.

## Why this is being built in phases

The full product spec covers customer/owner/admin roles and dashboards, hotel search with a dozen filters, a full booking + Razorpay payment flow, PDF invoicing, an email queue, coupons, support tickets, SEO, automated tests, Docker, and CI/CD. That's realistically a multi-month build for a small team. Generating all of it in a single pass would mean thousands of lines of shallow scaffolding that hasn't been reasoned through — a bad foundation for anything, and a genuinely risky one for something that will handle real payments and guest data. So this is being built in phases, each one working end-to-end before the next begins.

## Roadmap

| Phase | Scope |
|---|---|
| **1 — Foundation** *(delivered)* | Project structure, all 12 MongoDB/Mongoose data models, security middleware, logging, centralized error handling, env validation, starting `robots.txt`/`sitemap.xml` |
| **2 — Auth & RBAC** *(delivered)* | Register / login / logout, email verification, password reset, JWT + refresh tokens, customer/owner/admin roles |
| **3 — Hotels, Rooms & Search** *(backend delivered; frontend: homepage done, search/details pending)* | Owner hotel/room CRUD with image uploads, admin approval workflow, search + filters + sort, Next.js static-export homepage — still to come: the search results and hotel details pages |
| **4 — Booking & Payments** *(delivered)* | Razorpay order creation + signature verification, booking creation, PDF invoice + QR code, email queue (BullMQ + Redis) |
| **5 — Dashboards** *(delivered)* | Customer/owner/admin dashboards, reviews, coupons, support tickets, notifications |
| **6 — Ship it** *(delivered)* | SEO (sitemap script, JSON-LD), Swagger docs, automated tests, Docker, CI/CD, deployment guide |

## Production targets

- **Backend:** Render — `https://myroomm-backend-server.onrender.com`
- **Database:** MongoDB Atlas
- **Frontend:** `https://myroomm.in` on Hostinger (no Node.js runtime) — **decided:** Phase 3 builds Next.js as a static export, with all dynamic content (search, hotel pages, dashboards) fetched client-side from the Express API. See `frontend/README.md` for what that means in practice.

## Key decisions made in this phase

- **Backend in TypeScript.** The spec's tech-stack list only named TypeScript for the frontend, but the code-quality section asked for full typing throughout — so the backend is TypeScript too.
- **Express 4.x**, not 5 — the wider middleware ecosystem (including `express-mongo-sanitize`, used here) is more predictably compatible with it right now.
- **Room availability** is computed by checking for overlapping, non-cancelled bookings on a room, rather than maintaining a separate day-by-day calendar collection. Simpler for an MVP; documented as a tradeoff in `Room.ts` in case per-date pricing or inventory becomes necessary later.
- **`EmailLog` vs. "Email Queue".** The spec lists "Email Queue" as a database collection. BullMQ + Redis owns the actual live queue (retries, backoff, delayed jobs) — Mongo is a poor fit for that. `EmailLog` instead gives a durable, queryable record of what was sent or failed, which is what satisfies "log the failure, retry via the queue" without duplicating queue state in two places.
- **Invoices store snapshots**, not just references. A hotel's name or a room's price can change after a guest's stay; the invoice has to stay accurate to what was actually charged at the time, for accounting/legal reasons.

## Phase 2 — Auth endpoints

All under `/api/v1/auth`:

| Route | Method | Notes |
|---|---|---|
| `/register` | POST | `role` accepts `customer` or `hotel_owner` only — admin accounts are never self-registered |
| `/login` | POST | Returns an access token in the body; sets the refresh token as an httpOnly cookie |
| `/logout` | POST | Revokes that session's refresh token |
| `/refresh-token` | POST | Rotates the refresh token on every use |
| `/verify-email/:token` | GET | |
| `/resend-verification` | POST | |
| `/forgot-password` | POST | |
| `/reset-password/:token` | POST | Also revokes every existing session on that account |
| `/me` | GET | Requires a valid access token |

Two decisions worth knowing about:

- **Emails send inline for now**, via Resend with an SMTP fallback, rather than through the BullMQ queue — that upgrade lands in Phase 4. A failed send is logged to `EmailLog` and never blocks the request that triggered it, consistent with `EmailLog.ts` from Phase 1.
- **The refresh-token cookie needs `SameSite=None; Secure` in production**, because myroomm.in and the Render API are different domains — this is a genuinely cross-site cookie, not an incidental one. Locally, that means the frontend dev server will need to proxy API calls (Next.js rewrites work well) so the browser treats them as same-origin instead of fighting cross-site cookie rules — set up when the frontend is scaffolded in Phase 3.

## Phase 3 (backend) — Hotels, Rooms & Approval

All under `/api/v1/hotels` unless noted. Requests carrying images are `multipart/form-data`; array/object fields (`address`, `coordinates`, `amenities`, `nearbyPlaces`) travel as JSON-encoded strings in that format and get parsed back out server-side before validation.

| Route | Method | Access | Notes |
|---|---|---|---|
| `/` | GET | Public | Search — `city`, `guests`, `checkIn`/`checkOut`, `amenities` (comma-separated), `minPrice`/`maxPrice`, `sort`, `page`, `limit` |
| `/:slug` | GET | Public | One approved hotel + its active rooms |
| `/` | POST | Owner | Create a hotel — starts `pending`, at least one image required |
| `/my/hotels` | GET | Owner/Admin | The logged-in owner's hotels, any status |
| `/:id` | PATCH | Owner/Admin | Update a hotel; new images are appended, not replaced |
| `/admin/pending` | GET | Admin | Hotels awaiting review |
| `/:id/approve`, `/:id/reject`, `/:id/suspend` | PATCH | Admin | Each writes an `AuditLog` entry |
| `/:hotelId/rooms` | GET, POST | Owner/Admin | List / add rooms for that hotel |
| `/:hotelId/rooms/:id` | PATCH, DELETE | Owner/Admin | Update a room; DELETE deactivates rather than removes it |

Worth knowing:

- **Search filters in plain JS, not a MongoDB aggregation pipeline.** Two batched queries (hotels, then their rooms) feed an in-memory filter/sort/paginate step. Easy to verify correct by reading it, and fast enough at Deoghar-launch scale — worth revisiting with a real aggregation (or Atlas Search) once the hotel count is large enough for it to matter.
- **Hotel amenities are a fixed vocabulary** (`src/constants/amenities.ts`), not free text — otherwise "Pool" and "swimming pool" would silently fail to match each other when a search filters by it. Room amenities stay free text, since they don't feed a filter.
- **`checkIn`/`checkOut` are validated but don't exclude anything yet.** There's nothing to exclude until Bookings exist in Phase 4 — every approved hotel is trivially "available" for any date range right now.
- **Rooms are never hard-deleted, only deactivated** — a Booking will eventually reference a room by ID, so removing the row out from under it isn't safe.

## Phase 4 — Booking & Payments

All under `/api/v1/bookings` unless noted.

| Route | Method | Access | Notes |
|---|---|---|---|
| `/create-order` | POST | Customer | Computes pricing, creates a Razorpay order. Writes nothing to MongoDB. |
| `/verify-payment` | POST | Customer | Verifies the signature, then creates Payment + Booking — the only place a Booking is ever created |
| `/my` | GET | Customer | Booking history |
| `/:id` | GET | Owner of the booking, or Admin | Full booking + invoice |
| `/:id/cancel` | PATCH | Owner of the booking, or Admin | Marks `cancelled`, emails the customer |
| `/api/v1/payments/webhook` | POST | Razorpay (signature-verified) | Logged safety net — see note below |

Worth knowing:

- **Nothing is written to MongoDB until the payment signature is verified.** `create-order` computes pricing and opens a Razorpay order with the room/dates/customer/coupon encoded in the order's own `notes` — it doesn't touch the database. `verify-payment` re-fetches those notes from Razorpay itself (never trusts the client's request body for what's being booked) before creating anything, which is what stops a tampered request from booking a different room or date than what was actually paid for.
- **Emails now go through BullMQ**, not sent inline. `sendEmail()` (the function every controller calls — unchanged since Phase 2) enqueues a job and returns immediately; a worker started alongside the API in `server.ts` does the actual sending, with 3 retries and exponential backoff. `EmailLog` tracks status (`queued` → `retrying` → `sent`/`failed`) across those retries. The worker runs in the same process as the API for now — splitting it into its own service is a scaling problem to solve once volume justifies it, not before.
- **A double-booking race is handled, not ignored.** Availability is checked at order-creation *and* re-checked at verify-payment, since someone else could book the last room while a customer is mid-payment. Since money has already moved by verify-time, an oversold booking still gets created (status `pending` instead of `confirmed`) rather than silently dropped, and it's flagged in `AuditLog` (`BOOKING_OVERSOLD_NEEDS_REVIEW`) for a human to resolve.
- **The Razorpay webhook verifies signatures correctly (a common thing to get wrong) but doesn't yet reconcile anything** — it logs the event and stops. Full reconciliation (finding paid orders with no matching Booking) is a real Phase 6-ish addition once traffic makes the small gap between it and the client-side flow worth closing.
- **Cancellation doesn't call Razorpay's refund API yet.** The booking is marked `cancelled` and the customer is emailed immediately; actually moving money back is scoped into Phase 5 alongside the owner's dashboard refund workflow, so refunds get one consistent code path instead of two.
- **GST and the platform fee are flat, configurable percentages** (`GST_PERCENT`, `PLATFORM_FEE_PERCENT` in `.env`), not India's actual tiered hotel-GST slab. This makes the flow work end-to-end — confirm the real applicable rate with an accountant before it handles real money.

## Phase 5 — Dashboards & Reviews

**Reviews** (`/api/v1/reviews`) — one per completed booking; the hotel's `rating.average`/`count` recomputes on every new review.

| Route | Method | Access |
|---|---|---|
| `/hotel/:hotelId` | GET | Public |
| `/my` | GET | Customer |
| `/` | POST | Customer — only for their own `completed` bookings |
| `/:id/reply` | PATCH | Hotel owner (of that hotel) or Admin |
| `/:id/moderate` | PATCH | Admin — `isApproved`/`isFlagged` |

**Customer dashboard** (`/api/v1/customer`) — wishlist and notifications, both already-existing models from Phase 1 wired up for real: `dashboard-summary`, `wishlist` (GET/POST `:hotelId`/DELETE `:hotelId`), `notifications` (GET, `read-all`, `:id/read`).

**Owner dashboard** (`/api/v1/owner`) — `bookings` (their hotels only, `?status=` filter), `revenue` (today/this-month/last-month + growth % + occupancy %), `bookings/:id/cancel`, `bookings/:id/complete`, `bookings/:id/refund` (real Razorpay refund call).

**Admin** (`/api/v1/admin`) — `dashboard-summary`, `users` (`?role=`), `users/:id/suspend`, `users/:id/reactivate`, and full coupon CRUD (`coupons`, `coupons/:id`, `coupons/:id/deactivate`).

**Support tickets** (`/api/v1/support-tickets`) — `/` (create, with attachments), `/my`, `/all` (admin), `/:id`, `/:id/reply` (threaded), `/:id/status` (admin).

Worth knowing:

- **"Accept/Reject" isn't in here as a literal owner control**, and that's deliberate. Your spec lists it, but this platform's booking flow is payment-first — a Booking only ever exists *after* Razorpay confirms payment (Phase 1's core rule), so there's no pending, unpaid booking request left for an owner to accept or reject. What an owner can do instead: cancel a paid booking, mark it completed at checkout, and now — new this phase — issue a real refund through Razorpay. Same underlying need (the hotel calling off a stay), without a state that would contradict "never save a booking before payment verification." The reasoning is also in a comment at the top of `ownerCancelBooking` in `owner.controller.ts`.
- **Refunds are real now.** Phase 4 deliberately deferred this; `owner.controller.ts`'s `refundBooking` calls Razorpay's refund API, updates `Payment.refund` and `Payment.status`, and flips the booking to `refunded`. Cancellation (no money movement) and refund (money movement) are separate actions on purpose, since not every cancellation needs a refund and not every refund starts from a cancellation.
- **Notifications are wired into real events**, not just a shell — hotel approval/rejection, booking confirmation, and both cancellation paths (customer- and owner-initiated) all call `createNotification()` alongside their existing email. The pattern's established for adding more triggers later without more plumbing.
- **Occupancy is an approximation** — booked room-nights this month (clipped to the month boundary) over total available room-nights, good enough for a dashboard stat, not a precise inventory system.

## Phase 6 — Tests, Docker, CI/CD, SEO

**Tests** (`backend/tests`, run with `npm test`): unit tests for pricing/coupon logic, Razorpay signature verification, JWT round-tripping, and the auth/booking validators; integration tests for the full register→verify→login→refresh flow and hotel creation→approval→search visibility, run against the real Express app with [`mongodb-memory-server`](https://github.com/typegoose/mongodb-memory-server) (no real MongoDB needed). `email.service` and `upload.service` are mocked globally (`tests/mocks.setup.ts`) so tests never need a live Redis, Cloudinary, or email provider — this is also why the *whole* email queue module is mocked rather than just the function that calls it, since `queues/email.queue.ts` opens a live Redis connection the moment it's imported.

Like everything else in this build, these haven't been run — no network access in the sandbox that wrote them means no `npm install`, so treat them as reviewed-by-hand until you run `npm test` yourself.

**A real bug got caught writing these tests.** `middleware/auth.ts`'s `protect` was reading the user's role from the JWT payload instead of a fresh DB lookup — meaning a role change or a suspension wouldn't actually take effect until that person's existing access token expired (up to 15 minutes) or they logged in again. Fixed now: it reads `user.role`, not `decoded.role`. Worth knowing this class of bug exists — it's exactly the kind of thing unit tests are good at surfacing and manual testing tends to miss.

**Docker** — `backend/Dockerfile` is a multi-stage build (build stage compiles TypeScript, production stage installs only prod dependencies and copies the compiled `dist/`), with a `HEALTHCHECK` against `/health`. Root-level `docker-compose.yml` runs backend + MongoDB + Redis together for local full-stack testing — `docker compose up` and you have everything except the frontend.

**CI/CD** — two GitHub Actions workflows: `backend-ci.yml` (install, build, test on every push/PR touching `backend/`) and `deploy.yml` (pings Render's deploy hook once CI passes on `main`). Needs a `RENDER_DEPLOY_HOOK_URL` repo secret — see `DEPLOYMENT.md`.

**SEO** — genuinely split by what's buildable without a frontend:
- `backend/scripts/generate-sitemap.ts` (`npm run generate-sitemap`) queries approved hotels directly from MongoDB and writes a real `sitemap.xml` with every hotel and city, replacing the static Phase 1 placeholder. Since static export has no request-time rendering, this needs to run at *build* time — a scheduled rebuild or a webhook off hotel-approval is the natural next step once the frontend exists.
- `shared/seo/jsonld.ts` — schema.org `LodgingBusiness` and `BreadcrumbList` builders, ready for the frontend to drop into a `<script type="application/ld+json">` tag.
- Dynamic meta tags, Open Graph, Twitter Cards, and canonical URLs are all genuinely frontend work — they live in page `<head>` tags that don't exist until Phase 3's frontend does. Nothing to fake here; noting it rather than skipping it silently.

**Full deployment walkthrough** — MongoDB Atlas, Render, Redis, Cloudinary, Resend, Razorpay, GitHub Actions secrets, and a post-deploy checklist — is in `DEPLOYMENT.md`.

## Folder structure

```
myroomm/
├── .github/workflows/     # backend-ci.yml (test), deploy.yml (Render deploy hook)
├── backend/
│   ├── src/
│   │   ├── config/       # env validation, DB connection, logger, Cloudinary
│   │   ├── constants/    # fixed vocabularies (e.g. hotel amenities)
│   │   ├── controllers/  # auth, hotel, room, booking, payment, review, customer, owner, admin, supportTicket
│   │   ├── middleware/   # auth (JWT+RBAC), validate (Zod), upload (Multer), parseJsonFields, error handler, rate limiting
│   │   ├── models/       # all 12 Mongoose schemas
│   │   ├── queues/       # BullMQ email queue + worker
│   │   ├── routes/       # auth, hotel (+ nested room), booking, payment, review, customer, owner, admin, support-tickets
│   │   ├── services/     # email, image upload, hotel slugs, pricing, Razorpay, invoice PDF, notifications
│   │   ├── templates/    # branded HTML email templates (auth + booking, sharing one layout)
│   │   ├── types/        # Express Request augmentation (rawBody, for webhook verification)
│   │   ├── utils/        # ApiError/ApiResponse/catchAsync, JWT + token helpers, regex escaping
│   │   ├── validators/   # Zod request-body schemas — auth, hotel, room, booking, review, owner, admin, supportTicket
│   │   ├── app.ts        # Express app: security middleware, health check, swagger stub, routes
│   │   └── server.ts     # boot sequence, starts the email worker
│   ├── scripts/
│   │   └── generate-sitemap.ts
│   ├── tests/
│   │   ├── unit/         # pricing, Razorpay signatures, JWT, auth/booking validators
│   │   ├── integration/  # full auth flow, hotel creation -> approval -> search
│   │   └── *.setup.ts    # env vars, in-memory MongoDB, email/upload mocks
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── jest.config.js
│   ├── package.json
│   ├── .json
│   └── .env.example
├── frontend/               # Next.js 15, static export — see frontend/README.md for what's built vs. still ahead
│   ├── README.md
│   ├── src/
│   │   ├── app/           # layout, homepage, providers, global styles
│   │   ├── components/
│   │   │   ├── ui/        # shadcn-style Button/Input
│   │   │   ├── layout/    # Header, Footer, NewsletterForm
│   │   │   └── home/      # Hero, SearchBox, WhyChooseUs, PopularDestinations, FeaturedHotels, Testimonials
│   │   └── lib/           # api client (axios + refresh-token retry), Cloudinary image loader, cn() helper
│   └── public/
│       ├── robots.txt
│       └── sitemap.xml   # regenerated for real by backend/scripts/generate-sitemap.ts
├── shared/
│   ├── types/            # TypeScript types shared between frontend and backend
│   └── seo/              # JSON-LD builders (LodgingBusiness, BreadcrumbList) for the future frontend
├── docker-compose.yml    # backend + MongoDB + Redis, for local full-stack testing
└── DEPLOYMENT.md
```

## The 12 data models

| Model | Purpose |
|---|---|
| `User` | Customers, hotel owners, and admins in one collection, distinguished by `role` |
| `Hotel` | Listings — defaults to `status: "pending"`, only visible publicly once admin-approved |
| `Room` | Room types belonging to a hotel |
| `Booking` | A confirmed reservation — never created before payment is verified (see comment in the file) |
| `Payment` | Razorpay order/payment/signature tracking |
| `Review` | One per booking, tied to a completed stay |
| `Coupon` | Flat/percentage discounts with usage limits and expiry |
| `Notification` | In-app notifications per user |
| `SupportTicket` | Tickets with threaded replies |
| `Invoice` | Snapshotted invoice data + generated PDF/QR reference |
| `AuditLog` | Admin/owner action history |
| `EmailLog` | Durable record of queued/sent/failed emails |

## Running this locally

This was built in a sandbox with no network access, so it hasn't been through `npm install` or a real compile — treat it as reviewed-by-hand, not machine-verified, until you run it.

```bash
cd backend
cp .env.example .env   # then fill in real values — never commit this file
npm install
npm run build           # confirms it compiles cleanly
npm run dev
```

You'll need Node 20+, a MongoDB instance (Atlas or local), and Redis (for BullMQ, needed from Phase 4 onward — not required yet). Razorpay/Cloudinary/Resend keys aren't needed until Phases 3–4. **Get your Atlas connection string fresh from the Atlas dashboard** — see the security note in chat about the password shared earlier.

## Business rules already baked in

- Hotels default to `pending` — nothing in this schema goes public without an explicit admin approval step.
- `Booking` has no "cart" or "draft" state — see the comment at the top of `Booking.ts`.
- Invoices snapshot customer/hotel/room/pricing data so they can't silently drift.
- Email sends have a durable log (`EmailLog`) so a failure never blocks or invalidates a booking.
