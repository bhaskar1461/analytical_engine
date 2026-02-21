# Anylical Engine

India-first Gen-Z stock intelligence MVP built as a hybrid monorepo:

- `apps/web` - Next.js frontend
- `apps/api` - Fastify API gateway
- `services/intelligence` - FastAPI deterministic intelligence engines
- `packages/shared-types` - shared TypeScript interfaces
- `packages/config` - compliance and platform constants
- `supabase` - schema migrations and seed

## Product Guardrails

- Educational insights only
- No buy/sell directives
- No guaranteed return claims
- Mandatory disclaimers across all AI surfaces
- Deterministic trust scoring with auditable logic

## Local Setup

1. Install Node 20+ and `pnpm` 9+.
2. Install Python 3.12+.
3. Copy environment templates:
   - `.env.example` -> `.env`
   - `apps/api/.env.example` -> `apps/api/.env`
   - `apps/web/.env.example` -> `apps/web/.env.local`
   - `services/intelligence/.env.example` -> `services/intelligence/.env`
4. Apply migration in Supabase:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_expand_exchange_scope.sql`
   - optional seed `supabase/seed/001_nifty_seed.sql`
5. Start services:
   - `pnpm --filter @anylical/api dev`
   - `python -m uvicorn app.main:app --reload --port 8000` from `services/intelligence`
   - `pnpm --filter @anylical/web dev`

## Contracts

API endpoints implemented:

- `GET /api/stocks/search`
- `GET /api/stocks/:symbol`
- `GET /api/stocks/:symbol/trust-score`
- `GET /api/stocks/:symbol/news`
- `GET /api/stocks/:symbol/social`
- `POST /api/quiz/submit`
- `POST /api/portfolio/generate`
- `POST /api/sip/generate`
- `POST /api/donate/create-link`
- `POST /api/donate/webhook`
- `GET/POST/DELETE /api/user/watchlist`
- `POST /api/admin/sync/market-universe`
- `GET /api/admin/sync/market-universe/status`

## Universe Coverage

- `market_sync` ingests NSE, BSE, and NYSE symbol universes.
- Latest price snapshots and icon URLs are stored in `stocks` + `historical_prices`.
- Web explorer route: `/stocks`.

## Testing

- JS tests: `pnpm test`
- Intelligence tests: `cd services/intelligence && pytest`

## Deployment

- Railway + GitHub Actions deployment runbook: `DEPLOY_VERCEL.md`
- Deployment execution checklist: `DEPLOY_TASKS.md`
- Release gating checklist: `LAUNCH_CHECKLIST.md`

## Notes

This workspace was scaffolded offline. Install dependencies before running lint/build/test commands.
