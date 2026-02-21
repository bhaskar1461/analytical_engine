# Deployment Task Checklist

Use this as your execution board.

## Phase A - Setup

- [ ] A1. Create Supabase project
- [ ] A2. Create Upstash Redis database
- [ ] A3. Create Razorpay keys/webhook secret
- [ ] A4. Push repo to GitHub

## Phase B - Database

- [ ] B1. Apply `supabase/migrations/0001_init.sql`
- [ ] B2. Apply `supabase/migrations/0002_expand_exchange_scope.sql`
- [ ] B3. Optional seed `supabase/seed/001_nifty_seed.sql`
- [ ] B4. Verify `stocks.exchange` supports `NSE/BSE/NYSE`

## Phase C - Railway Backend + GitHub Automation

- [ ] C1. Create Railway project
- [ ] C2. Create `anylical-intelligence` service (`services/intelligence`)
- [ ] C3. Create `anylical-api` service (repo root + `pnpm --filter @anylical/api ...`)
- [ ] C4. Set API env vars (including `API_INTERNAL_TOKEN`, `ADMIN_SYNC_KEY`)
- [ ] C5. Set intelligence env vars (including `API_INTERNAL_TOKEN`, `ADMIN_SYNC_KEY`)
- [ ] C6. Add GitHub Actions repository secrets for `.github/workflows/scheduled-jobs.yml`
- [ ] C7. Confirm API health: `/api/health`
- [ ] C8. Confirm intelligence health: `/health`

## Phase D - Initial Data Sync

- [ ] D1. Run `market_sync` once from GitHub Actions (`workflow_dispatch`)
- [ ] D2. Check sync status (`GET /api/admin/sync/market-universe/status`)
- [ ] D3. Verify exchange counts > 0 for NSE/BSE/NYSE

## Phase E - Railway Web Deploy

- [ ] E1. Create `anylical-web` Railway service (repo root + `pnpm --filter @anylical/web ...`)
- [ ] E2. Set env vars:
  - [ ] `NEXT_PUBLIC_API_BASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] E3. Confirm web health: `/`

## Phase F - Validation

- [ ] F1. Open `/`
- [ ] F2. Open `/stocks`
- [ ] F3. Open `/stock/RELIANCE.NS`
- [ ] F4. Open `/quiz`, `/portfolio`, `/sip`, `/donate`, `/watchlist`
- [ ] F5. In `/stocks`, test `Load Status`
- [ ] F6. In `/stocks`, test `Run Full Sync`
- [ ] F7. Validate disclaimers on AI pages

## Phase G - Launch Signoff

- [ ] G1. Complete `LAUNCH_CHECKLIST.md`
- [ ] G2. Save final production URLs
- [ ] G3. Share admin runbook with your team

## Production URLs (fill this)

- API:
- Intelligence:
- Web:
- Supabase:
- Upstash:

## Secret Registry (fill this securely)

- `API_INTERNAL_TOKEN`: set
- `ADMIN_SYNC_KEY`: set
- `SUPABASE_SERVICE_ROLE_KEY`: set
- `SUPABASE_JWT_SECRET`: set
- `RAZORPAY_WEBHOOK_SECRET`: set
