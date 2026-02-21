-- 0002_expand_exchange_scope.sql
-- Add NYSE support to stock universe

alter table if exists public.stocks
  drop constraint if exists stocks_exchange_check;

alter table if exists public.stocks
  add constraint stocks_exchange_check
  check (exchange in ('NSE', 'BSE', 'NYSE'));
