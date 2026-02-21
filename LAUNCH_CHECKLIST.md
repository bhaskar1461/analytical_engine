# Launch Checklist

This checklist maps to the MVP acceptance criteria and Week 5 hardening goals.

## 1) Runtime Health

- [x] `apps/web` builds and serves all required pages.
- [x] `apps/api` exposes all MVP endpoints and OpenAPI docs.
- [x] `services/intelligence` exposes trust/social/quiz/portfolio/SIP endpoints.
- [x] `/api/health` and `/health` return service health metadata.

## 2) Data and Jobs

- [x] Nightly trust recompute persists `trust_scores` with model version.
- [x] News ingest writes article-level rows with dedup markers.
- [x] Social ingest writes Reddit-derived posts with anti-manipulation flags.
- [x] Market and financial sync jobs are scheduled in `render.yaml`.

## 3) Compliance and Safety

- [x] Mandatory disclaimers are rendered across stock, quiz, portfolio, SIP, donate, watchlist surfaces.
- [x] Forbidden advisory phrases are sanitized in API/intelligence narratives.
- [x] Portfolio and SIP outputs are explicitly marked educational/non-binding.
- [x] Donation language states contributions do not affect intelligence outputs.

## 4) Functional Flows

- [x] Search -> stock intelligence flow works.
- [x] Quiz submission returns deterministic risk profile.
- [x] Portfolio generation enforces allocation constraints and persists when authenticated.
- [x] SIP generation enforces budget and deterministic rebalancing triggers.
- [x] Donation link creation and webhook signature verification are implemented.
- [x] Authenticated watchlist add/list/remove is implemented.

## 5) Performance and Resilience

- [x] API cache layer active for trust/news/social responses.
- [x] Response-time header is emitted for API and intelligence requests.
- [x] Stale-data behavior is surfaced for trust/news/social degradation.
- [x] Cache diagnostics are exposed via `/api/health`.

## 6) Observability

- [x] API request latency tracking with slow-request warnings.
- [x] API exception capture hooks with optional Sentry + PostHog forwarding.
- [x] Intelligence request latency tracking and exception hooks.
- [x] Environment toggles for telemetry are documented in `.env.example` files.

## 7) Quality Gates

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] API unit tests for compliance, news staleness, donation signature.
- [x] Web E2E specs include route accessibility and mocked user journey/failure path.

## 8) Manual Release Steps (Pre-Go-Live)

- [ ] Run Playwright E2E against deployed environments.
- [ ] Verify Supabase migration + seed on production project.
- [ ] Configure real provider keys (NewsAPI, Reddit, Razorpay, Supabase, Upstash).
- [ ] Validate Razorpay webhook delivery with production secret.
- [ ] Confirm cron jobs execute and update `trust_scores`, `news_items`, `social_posts`, `social_daily`.
- [ ] Confirm Sentry/PostHog dashboards receive events.
- [ ] Verify mobile and desktop smoke tests across all pages.
