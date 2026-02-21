# Deployment Runbook (Railway + GitHub Actions)

This project is deployed with:

- `apps/web` on **Railway**
- `apps/api` on **Railway**
- `services/intelligence` on **Railway**
- scheduled jobs on **GitHub Actions** (`.github/workflows/scheduled-jobs.yml`)
- `Supabase` for Postgres/Auth
- `Upstash` for Redis cache/rate-limit

---

## 1) Prerequisites

1. Code pushed to GitHub.
2. Supabase project created.
3. Upstash Redis created.
4. Razorpay account created (for donations).
5. Railway project available.
6. GitHub Actions enabled on the repository.

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

## 3) Create Railway Services

Create 3 Railway services from the same GitHub repo:

1. `anylical-intelligence`
2. `anylical-api`
3. `anylical-web`

Recommended service settings:

- `anylical-intelligence`
  - Root Directory: `services/intelligence`
  - Build Command: `pip install .`
  - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`

- `anylical-api`
  - Root Directory: `/` (repo root)
  - Build Command: `corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --frozen-lockfile && pnpm --filter @anylical/api build`
  - Start Command: `pnpm --filter @anylical/api start`

- `anylical-web`
  - Root Directory: `/` (repo root)
  - Build Command: `corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --frozen-lockfile && pnpm --filter @anylical/web build`
  - Start Command: `pnpm --filter @anylical/web start`

---

## 4) Railway Environment Variables

Set **Intelligence** service env vars:

- `INTELLIGENCE_PORT=8000`
- `API_INTERNAL_TOKEN=<strong-random-token>`
- `ADMIN_SYNC_KEY=<strong-random-token>`
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

Set **API** service env vars:

- `NODE_ENV=production`
- `API_PORT=4000`
- `APP_BASE_URL=https://<your-web-domain>`
- `INTELLIGENCE_BASE_URL=https://<your-intelligence-domain>`
- `API_INTERNAL_TOKEN=<same as intelligence>`
- `ADMIN_SYNC_KEY=<same as intelligence>`
- `SUPABASE_URL=<supabase-url>`
- `SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>`
- `SUPABASE_JWT_SECRET=<supabase-jwt-secret>`
- `UPSTASH_REDIS_REST_URL=<upstash-url>`
- `UPSTASH_REDIS_REST_TOKEN=<upstash-token>`
- `RAZORPAY_KEY_ID=<razorpay-key-id>`
- `RAZORPAY_KEY_SECRET=<razorpay-key-secret>`
- `RAZORPAY_WEBHOOK_SECRET=<razorpay-webhook-secret>`
- Optional: `SENTRY_DSN`, `POSTHOG_KEY`, `POSTHOG_HOST`

Set **Web** service env vars:

- `NEXT_PUBLIC_API_BASE_URL=https://<your-api-domain>`
- `NEXT_PUBLIC_SUPABASE_URL=<supabase-url>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>`

Critical rules:

- `API_INTERNAL_TOKEN` must match across API and intelligence.
- `ADMIN_SYNC_KEY` must match across API and intelligence.
- `APP_BASE_URL` should match deployed web domain.
- `INTELLIGENCE_BASE_URL` should match deployed intelligence domain.

---

## 5) Configure GitHub Scheduled Jobs

Workflow file: `.github/workflows/scheduled-jobs.yml`

Add these GitHub repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEWS_API_KEY`

Validate schedule mapping:

- `market_sync`: daily `01:00 IST`
- `financial_sync`: weekly `02:00 IST` (Sunday)
- `trust_recompute`: daily `03:00 IST`
- `news_ingest`: every 5 minutes
- `social_ingest`: every 10 minutes

Manual run (recommended before go-live):

- GitHub UI: Actions -> `Scheduled Jobs` -> `Run workflow` -> choose `job=market_sync`
- or CLI:

```bash
gh workflow run scheduled-jobs.yml -f job=market_sync
```

---

## 6) Health Verification

Check:

- `GET https://<api-domain>/api/health`
- `GET https://<intelligence-domain>/health`
- `GET https://<web-domain>/`

All must return `200`.

---

## 7) First Market Universe Sync

Run once after backend deploy:

```bash
curl -X POST "https://<api-domain>/api/admin/sync/market-universe" \
  -H "x-admin-key: <ADMIN_SYNC_KEY>"
```

Check status:

```bash
curl -X GET "https://<api-domain>/api/admin/sync/market-universe/status" \
  -H "x-admin-key: <ADMIN_SYNC_KEY>"
```

Expected:

- non-zero `activeStocksCount`
- exchange counts for `NSE`, `BSE`, `NYSE`
- `latestTradingDate` present

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

1. Roll back Railway service to previous stable deployment for `anylical-web`, `anylical-api`, and `anylical-intelligence`.
2. Temporarily disable `Scheduled Jobs` workflow runs in GitHub Actions.
3. Pause manual sync triggers until root cause is fixed.

---

## 10) Cost Note

- Keep Railway + Supabase in nearby regions for latency.
- Railway pricing and free credits can change over time; verify current plan details before go-live.
- Rotate `API_INTERNAL_TOKEN` and `ADMIN_SYNC_KEY` periodically.
