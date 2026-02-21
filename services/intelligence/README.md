# Intelligence Service

FastAPI service providing deterministic trust score, risk quiz scoring, portfolio generation, SIP optimization, and social/news signals.

## Endpoints

- `GET /v1/trust-score/{symbol}`
- `GET /v1/social/{symbol}`
- `POST /v1/quiz/score`
- `POST /v1/portfolio/generate`
- `POST /v1/sip/generate`
- `POST /v1/admin/market-sync`
- `GET /health`

All endpoints require `x-internal-token` except `/health`.
`/v1/admin/market-sync` also requires `x-admin-key`.

## Universe Sync

- `python -m app.jobs.market_sync` ingests NSE, BSE, and NYSE listings.
- Universe source URLs can be overridden with:
  - `NSE_UNIVERSE_URL`
  - `BSE_UNIVERSE_URL`
  - `NYSE_UNIVERSE_URL`
  - `UNIVERSE_LIMIT_PER_EXCHANGE`

## Telemetry

Optional environment variables:

- `SENTRY_DSN`
- `POSTHOG_KEY`
- `POSTHOG_HOST` (defaults to `https://app.posthog.com`)

When configured, request latency and exceptions are emitted as best-effort telemetry events.
