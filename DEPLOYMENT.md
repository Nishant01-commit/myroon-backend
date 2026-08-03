# Deployment Guide

## What you need before deploying

| Service | Used for | Free tier? |
|---|---|---|
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Database | Yes (M0 cluster) |
| [Render](https://render.com) | Backend hosting | Yes (spins down when idle) |
| Redis — [Upstash](https://upstash.com) or [Redis Cloud](https://redis.com/try-free/) | BullMQ email queue | Yes |
| [Cloudinary](https://cloudinary.com) | Image/invoice storage | Yes |
| [Resend](https://resend.com) | Transactional email | Yes (limited sends/month) |
| [Razorpay](https://razorpay.com) | Payments | Test mode is free — use test mode until you're ready to go live |
| Hostinger | Frontend static hosting | You already have this |

## 1. MongoDB Atlas

1. Create a free M0 cluster.
2. Database Access → add a user with a strong, generated password (not one you've typed anywhere else — see the note on this in the chat history if you're picking up this project after the fact).
3. Network Access → allow access from anywhere (`0.0.0.0/0`) for Render's dynamic IPs, or Render's specific IP ranges if you want it tighter.
4. Connect → Drivers → copy the connection string into `MONGODB_URI`.

## 2. Redis (Upstash or Redis Cloud)

Create a free database, copy its connection URL into `REDIS_URL`. Needed for the BullMQ email queue (Phase 4) — nothing else depends on it.

## 3. Cloudinary, Resend, Razorpay

Sign up, grab the API keys from each dashboard, drop them into the matching `.env` vars (see `backend/.env.example`). Keep Razorpay in **test mode** until you've verified a full booking end-to-end with a test card.

## 4. Backend on Render

1. New → Web Service → connect the GitHub repo.
2. Root directory: `backend`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add every variable from `backend/.env.example` under Environment — with real values, and `CLIENT_URL` set to `https://myroomm.in`.
6. Once deployed, confirm `https://myroomm-backend-server.onrender.com/health` returns `{"status":"ok", ...}`.
7. Settings → Deploy Hook → copy the URL, add it as a GitHub Actions secret named `RENDER_DEPLOY_HOOK_URL` (repo Settings → Secrets and variables → Actions). This is what `.github/workflows/deploy.yml` calls after CI passes on `main`.

Render's free tier spins the service down after inactivity, so the first request after a quiet spell will be slow (10-30s) while it wakes up — worth knowing before assuming something's broken.

## 5. Frontend on Hostinger (once Phase 3's frontend is built)

Since myroomm.in has no Node.js runtime, the frontend builds as a static export:

```bash
cd frontend
npm run build      # produces an out/ folder
```

Upload the **contents** of `out/` (not the folder itself) to Hostinger's `public_html` via File Manager or FTP/SFTP. Re-run this and re-upload whenever the site changes, including after `npm run generate-sitemap` in the backend regenerates `frontend/public/sitemap.xml` with live hotel data — that file only updates on the next build, since there's no server here to generate it per-request.

## 6. GitHub Actions

Two workflows, both under `.github/workflows/`:

- **`backend-ci.yml`** — runs on every push/PR touching `backend/`: install, build, test.
- **`deploy.yml`** — runs after CI succeeds on `main`, and pings Render's deploy hook. Render also auto-deploys on push by default if you've connected the repo directly, so this is a second, explicit trigger tied to CI passing rather than just a push happening — remove one or the other if having both feels redundant.

## 7. Post-deploy checklist

- [ ] `GET /health` returns `ok` and `dbState: "connected"`
- [ ] Register a test account, confirm the verification email arrives (check spam first)
- [ ] Create a test hotel + room as a hotel_owner account, approve it as admin, confirm it appears in search
- [ ] Run a full booking with a [Razorpay test card](https://razorpay.com/docs/payments/payments/test-card-upi-details/) before switching Razorpay out of test mode
- [ ] Submit `sitemap.xml` and verify domain ownership in [Google Search Console](https://search.google.com/search-console)
- [ ] Rotate any credential that was ever pasted somewhere outside your password manager — Render's env vars, your local `.env`, and Atlas are the only places real secrets should live

## Monitoring & backups

- **Render** gives you basic CPU/memory metrics and logs out of the box; add an uptime check (e.g., [UptimeRobot](https://uptimerobot.com), free tier) against `/health` for actual alerting if it goes down.
- **MongoDB Atlas** M0 clusters don't include automated backups — this is the main gap worth closing before this holds real bookings. Atlas's paid tiers add continuous backups; alternatively, a scheduled `mongodump` via a GitHub Action to your own storage is a lower-cost stopgap.
