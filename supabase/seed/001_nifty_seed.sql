insert into public.stocks(symbol, name, sector, exchange, icon_url, is_active)
values
  ('RELIANCE.NS', 'Reliance Industries', 'Energy', 'NSE', null, true),
  ('TCS.NS', 'Tata Consultancy Services', 'Information Technology', 'NSE', null, true),
  ('INFY.NS', 'Infosys', 'Information Technology', 'NSE', null, true),
  ('HDFCBANK.NS', 'HDFC Bank', 'Financial Services', 'NSE', null, true),
  ('ICICIBANK.NS', 'ICICI Bank', 'Financial Services', 'NSE', null, true),
  ('SBIN.NS', 'State Bank of India', 'Financial Services', 'NSE', null, true),
  ('BHARTIARTL.NS', 'Bharti Airtel', 'Telecom', 'NSE', null, true),
  ('ITC.NS', 'ITC', 'FMCG', 'NSE', null, true),
  ('HINDUNILVR.NS', 'Hindustan Unilever', 'FMCG', 'NSE', null, true),
  ('LT.NS', 'Larsen & Toubro', 'Industrials', 'NSE', null, true)
on conflict (symbol) do nothing;
