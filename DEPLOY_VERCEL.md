# Deployment Runbook (Vercel + Render)

This project is deployed as a hybrid stack:

- `apps/web` on **Vercel**
- `apps/api` + `services/intelligence` + cron jobs on **Render**
- `Supabase` for Postgres/Auth
- `Upstash` for Redis cache/rate-limit

---

## 1) Prerequisites

1. Code pushed to GitHub.
2. Supabase project created.
3. Upstash Redis created.
4. Razorpay account created (for donations).
5. Render account + Vercel account available.

---

## 2) Database Setup (Supabase)

Run SQL in this order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_expand_exchange_scope.sql`
3. Optional seed: `supabase/seed/001_nifty_seed.sql`

Validation:

- Table `stocks` exists.
- `stocks.exchange` allows `NSE`, `BSE`, `NYSE`.

---

## 3) Create Render Services

Use `render.yaml` to create services:

- `anylical-api` (web)
- `anylical-intelligence` (web)
- `market-sync` (cron)
- `financial-sync-weekly` (cron)
- `trust-recompute` (cron)
- `news-ingest` (cron)
- `social-ingest` (cron)

---

## 4) Render Environment Variables

Set **API** service env vars:

- `NODE_ENV=production`
- `API_PORT=4000`
- `APP_BASE_URL=https://<your-vercel-domain>`
- `INTELLIGENCE_BASE_URL=https://<your-intelligence-service>.onrender.com`
- `API_INTERNAL_TOKEN=<strong-random-token>`
- `ADMIN_SYNC_KEY=<strong-random-token>`
- `SUPABASE_URL=<supabase-url>`
- `SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>`
- `SUPABASE_JWT_SECRET=<supabase-jwt-secret>`
- `UPSTASH_REDIS_REST_URL=<upstash-url>`
- `UPSTASH_REDIS_REST_TOKEN=<upstash-token>`
- `RAZORPAY_KEY_ID=<razorpay-key-id>`
- `RAZORPAY_KEY_SECRET=<razorpay-key-secret>`
- `RAZORPAY_WEBHOOK_SECRET=<razorpay-webhook-secret>`
- Optional: `SENTRY_DSN`, `POSTHOG_KEY`, `POSTHOG_HOST`

Set **Intelligence** service env vars:

- `INTELLIGENCE_PORT=8000`
- `API_INTERNAL_TOKEN=<same as API_INTERNAL_TOKEN>`
- `ADMIN_SYNC_KEY=<same as ADMIN_SYNC_KEY>`
- `SUPABASE_URL=<supabase-url>`
- `SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>`
- `NEWS_API_KEY=<newsapi-key>`
- `REDDIT_USER_AGENT=anylical-engine/1.0`
- Optional universe overrides:
  - `NSE_UNIVERSE_URL`
  - `BSE_UNIVERSE_URL`
  - `NYSE_UNIVERSE_URL`
  - `UNIVERSE_LIMIT_PER_EXCHANGE=0`
- Optional: `SENTRY_DSN`, `POSTHOG_KEY`, `POSTHOG_HOST`

Critical rules:

- `API_INTERNAL_TOKEN` must match across API and intelligence.
- `ADMIN_SYNC_KEY` must match across API and intelligence.

---

## 5) Render Health Verification

Check:

- `GET https://<api-service>.onrender.com/api/health`
- `GET https://<intelligence-service>.onrender.com/health`

Both must return `200`.

---

## 6) First Market Universe Sync

Run once after backend deploy:

```bash
curl -X POST "https://<api-service>.onrender.com/api/admin/sync/market-universe" \
  -H "x-admin-key: <ADMIN_SYNC_KEY>"
```

Check status:

```bash
curl -X GET "https://<api-service>.onrender.com/api/admin/sync/market-universe/status" \
  -H "x-admin-key: <ADMIN_SYNC_KEY>"
```

Expected:

- non-zero `activeStocksCount`
- exchange counts for `NSE`, `BSE`, `NYSE`
- `latestTradingDate` present

---

## 7) Deploy Web on Vercel

### Option A: Vercel Dashboard

1. Add new project from GitHub repo.
2. Keep project root at repository root.
3. `vercel.json` already defines build behavior.
4. Set Vercel env vars:
   - `NEXT_PUBLIC_API_BASE_URL=https://<api-service>.onrender.com`
   - `NEXT_PUBLIC_SUPABASE_URL=<supabase-url>`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>`
5. Deploy.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Then set env vars:

```bash
vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel --prod
```

---

## 8) Post-Deploy Functional Checks

Validate these routes load without blocking errors:

- `/`
- `/stocks`
- `/stock/RELIANCE.NS`
- `/quiz`
- `/portfolio`
- `/sip`
- `/donate`
- `/watchlist`

Admin checks on `/stocks`:

- `Load Status` works with `ADMIN_SYNC_KEY`
- `Run Full Sync` works with `ADMIN_SYNC_KEY`

Data checks:

- search shows multiple exchanges
- cards show logo + price + trend
- stale warnings appear when providers fail

---

## 9) Rollback Plan

If release is unstable:

1. Rollback Vercel to previous deployment.
2. Rollback Render API/intelligence to previous successful deploy.
3. Disable admin sync trigger use until root cause fixed.
4. Keep cron jobs paused if ingestion causes DB pressure.

---

## 10) Notes

- Full Vercel-only hosting is not recommended for this architecture.
- Keep Render + Supabase in nearby regions for latency.
- Rotate `API_INTERNAL_TOKEN` and `ADMIN_SYNC_KEY` periodically.
