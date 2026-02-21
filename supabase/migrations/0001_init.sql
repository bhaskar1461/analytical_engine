-- 0001_init.sql
-- India-first Gen-Z Stock Intelligence Platform schema

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create table if not exists public.stocks (
  symbol text primary key,
  name text not null,
  sector text not null,
  exchange text not null check (exchange in ('NSE', 'BSE')),
  icon_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.historical_prices (
  id bigserial primary key,
  symbol text not null references public.stocks(symbol) on delete cascade,
  trading_date date not null,
  open numeric(12,4) not null,
  high numeric(12,4) not null,
  low numeric(12,4) not null,
  close numeric(12,4) not null,
  adj_close numeric(12,4) not null,
  volume bigint not null,
  created_at timestamptz not null default now(),
  unique (symbol, trading_date)
);

create table if not exists public.financials (
  id bigserial primary key,
  symbol text not null references public.stocks(symbol) on delete cascade,
  period_end date not null,
  roe numeric(8,4),
  de_ratio numeric(8,4),
  revenue_growth numeric(8,4),
  operating_margin numeric(8,4),
  interest_coverage numeric(8,4),
  created_at timestamptz not null default now(),
  unique (symbol, period_end)
);

create table if not exists public.trust_scores (
  id bigserial primary key,
  symbol text not null references public.stocks(symbol) on delete cascade,
  as_of_date date not null,
  trust_score numeric(6,2) not null check (trust_score >= 0 and trust_score <= 100),
  historical_score numeric(6,2) not null,
  financial_score numeric(6,2) not null,
  news_score numeric(6,2) not null,
  market_score numeric(6,2) not null,
  confidence numeric(5,2) not null,
  limited_data_flag boolean not null default false,
  hype_penalty numeric(6,2) not null default 0,
  model_version text not null,
  explanation_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (symbol, as_of_date)
);

create table if not exists public.source_credibility (
  source text primary key,
  reputation_weight numeric(5,2) not null check (reputation_weight >= 0 and reputation_weight <= 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  symbol text not null references public.stocks(symbol) on delete cascade,
  source text not null,
  title text not null,
  url text not null,
  published_at timestamptz not null,
  sentiment numeric(5,2) not null,
  confidence numeric(5,2) not null,
  credibility_weight numeric(5,2) not null,
  is_duplicate boolean not null default false,
  content_hash text,
  created_at timestamptz not null default now(),
  unique (url)
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  symbol text not null references public.stocks(symbol) on delete cascade,
  source_post_id text not null,
  created_at timestamptz not null,
  karma integer not null,
  account_age_days integer not null,
  sentiment numeric(5,2) not null,
  is_bot boolean not null default false,
  is_spam boolean not null default false,
  post_hash text not null,
  raw_json jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  unique (source_post_id)
);

create table if not exists public.social_daily (
  id bigserial primary key,
  symbol text not null references public.stocks(symbol) on delete cascade,
  as_of_date date not null,
  bullish_pct numeric(5,2) not null,
  bearish_pct numeric(5,2) not null,
  hype_velocity numeric(8,2) not null,
  confidence numeric(5,2) not null,
  meme_risk_flag boolean not null default false,
  created_at timestamptz not null default now(),
  unique (symbol, as_of_date)
);

create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  raw_responses jsonb not null,
  risk_score numeric(5,2) not null,
  persona text not null,
  risk_level text not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  risk_persona text not null,
  amount_inr numeric(14,2) not null,
  horizon_months integer not null,
  confidence numeric(5,2) not null,
  risk_level text not null,
  volatility_estimate numeric(6,2) not null,
  allocations_json jsonb not null,
  warnings_json jsonb not null default '[]'::jsonb,
  model_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  monthly_budget_inr numeric(14,2) not null,
  risk_persona text not null,
  horizon_months integer not null,
  expected_drawdown numeric(6,2) not null,
  rebalance_triggers_json jsonb not null,
  allocations_json jsonb not null,
  warnings_json jsonb not null default '[]'::jsonb,
  model_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  amount_inr numeric(12,2) not null,
  tier text not null,
  provider text not null default 'razorpay',
  provider_payment_id text,
  provider_order_id text,
  status text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  symbol text,
  user_id uuid references public.users(id) on delete set null,
  payload_json jsonb not null default '{}'::jsonb,
  model_version text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_watchlist_unique on public.watchlists(user_id, symbol);
create index if not exists idx_prices_symbol_date on public.historical_prices(symbol, trading_date desc);
create index if not exists idx_financials_symbol_period on public.financials(symbol, period_end desc);
create index if not exists idx_trust_symbol_date on public.trust_scores(symbol, as_of_date desc);
create index if not exists idx_news_symbol_published on public.news_items(symbol, published_at desc);
create index if not exists idx_social_symbol_created on public.social_posts(symbol, created_at desc);
create index if not exists idx_social_daily_symbol_date on public.social_daily(symbol, as_of_date desc);
create index if not exists idx_audit_event_type_created on public.audit_events(event_type, created_at desc);
create unique index if not exists idx_donations_payment_unique on public.donations(provider_payment_id);

insert into public.source_credibility (source, reputation_weight)
values
  ('moneycontrol.com', 0.85),
  ('livemint.com', 0.82),
  ('economictimes.indiatimes.com', 0.80),
  ('business-standard.com', 0.78),
  ('unknown', 0.50)
on conflict (source) do nothing;
