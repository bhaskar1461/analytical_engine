# Runbook

## Service Ports

- Web: `3000`
- API Gateway: `4000`
- Intelligence: `8000`

## Required Secrets

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEWS_API_KEY`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `API_INTERNAL_TOKEN`
- `ADMIN_SYNC_KEY`

## Optional Universe Overrides

- `NSE_UNIVERSE_URL`
- `BSE_UNIVERSE_URL`
- `NYSE_UNIVERSE_URL`
- `UNIVERSE_LIMIT_PER_EXCHANGE` (`0` means no cap)

## Startup Sequence

1. Start intelligence service.
2. Start API gateway (depends on intelligence URL).
3. Start web app.
4. Verify `/api/health` and `/health`.

## Deployment

- Railway deployment guide: `DEPLOY_VERCEL.md`
- Launch readiness gate: `LAUNCH_CHECKLIST.md`

## Scheduled Jobs (GitHub Actions)

- Workflow: `.github/workflows/scheduled-jobs.yml`
- `market_sync` daily `01:00 IST`
- `financial_sync` weekly `02:00 IST`
- `trust_recompute` nightly `03:00 IST`
- `news_ingest` every 5 minutes
- `social_ingest` every 10 minutes

## Incident Playbook

### External provider outage

1. Confirm stale fallback behavior on stock pages.
2. Validate cache serving (`staleData=true`).
3. Check job errors in GitHub Actions run logs.
4. Keep UI warnings active until provider recovers.

### Trust score anomalies

1. Inspect `audit_events` for model version and payload drift.
2. Verify `trust_scores` daily delta does not exceed 10 points.
3. Re-run `trust_recompute` manually.

### Manual universe refresh

1. Open `/stocks`.
2. Enter `ADMIN_SYNC_KEY` in the admin sync panel.
3. Click `Run Full Sync`.
4. Verify success message with stock/price upsert counts.
5. Spot-check `GET /api/stocks/search?exchange=NSE&page=1`.

### Telemetry drift

1. Check `/api/health` dependency and cache diagnostics.
2. Confirm Sentry receives `api.exception` or `intelligence.exception` events.
3. Confirm PostHog receives `api.request` and `intelligence.request` events.

### Webhook failures

1. Validate Razorpay signature secret.
2. Verify `/api/donate/webhook` receives raw payload.
3. Check `donations` and `audit_events` insert status.

## Compliance Checklist

- Mandatory disclaimers rendered on stock, quiz, portfolio, SIP pages.
- No forbidden phrases in generated narratives.
- Portfolio and SIP outputs labelled educational/non-binding.
