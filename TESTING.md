# Local Testing Guide

Everything in this repo was written without ever being run — the sandbox that built it has no network access, so there's been no `npm install`, no compile, no test run. This is the checklist for actually finding out what works.

## 1. Prerequisites

- Node.js 20+
- A MongoDB connection — either a real [Atlas](https://www.mongodb.com/atlas) cluster, or local Mongo via `docker compose up mongo` from the repo root
- Everything else (Redis, Cloudinary, Razorpay, Resend) can wait — the app is built to degrade gracefully without them. Email sends fail silently and log to `EmailLog` rather than crashing; payments return a clear 503 instead of a stack trace if Razorpay isn't configured.

## 2. Set up and install

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:
- `MONGODB_URI` — required. Use a fresh connection string if the one you had is the one that got shared earlier in this build — see the security note from Phase 1 if you're picking this up later and don't remember why that matters.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — any long random string works for local testing.
- Leave the rest blank for now.

```bash
npm install
```

## 3. Confirm it compiles

```bash
npm run build
```

This is the first real signal. TypeScript errors, if there are any, show up here. **Paste the output back to me if anything fails and I'll fix it** — this is the fastest way to close the loop between "written blind" and "actually works."

## 4. Run the test suite

```bash
npm test
```

First run downloads a small MongoDB binary for `mongodb-memory-server` — that can take a minute or two; it's fast after that. Everything in `tests/unit` and `tests/integration` should pass. Same as above: any failure, send me the output.

## 5. Start it for real

```bash
npm run dev
```

Should log `MongoDB connected` and `MyRoomm API running on port 5000`.

## 6. A manual smoke test

```bash
curl http://localhost:5000/health

curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Owner","email":"owner@test.com","password":"password123","role":"hotel_owner"}'

curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.com","password":"password123"}'
# copy the accessToken from the response for anything that needs auth
```

Creating a hotel needs a multipart request (image upload), which is easier in Postman/Insomnia than raw curl. Or open `http://localhost:5000/api-docs` once the server's running — every endpoint is listed there and some are directly testable.

## What to prioritize checking

Roughly in order of how much damage a bug would do:

1. **Payment verification** (`/api/v1/bookings/verify-payment`) — the only place a Booking is ever created. Highest stakes by far.
2. **Auth** (register/login/refresh) — gates everything else.
3. **Hotel approval workflow** — the "never publish without approval" rule.
4. Everything else.

## If something breaks

Paste it back — a stack trace, a failing test's output, a curl response that doesn't look right, whatever you've got. I'll fix it directly instead of guessing at what might be wrong.
