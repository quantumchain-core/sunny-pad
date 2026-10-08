-- Cache only, no user data, non-custodial
-- For frontend speed only

create table if not exists coins (
  mint text primary key,
  creator text not null,
  name text not null,
  symbol text not null,
  uri text,
  virtual_sol_reserves bigint,
  virtual_token_reserves bigint,
  real_sol_reserves bigint,
  complete boolean default false,
  created_at timestamp default now()
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  mint text references coins(mint),
  type text check (type in ('buy','sell')),
  sol_amount bigint,
  token_amount bigint,
  fee_treasury bigint,
  fee_creator_or_competition bigint,
  trader text,
  tx_signature text,
  created_at timestamp default now()
);

-- Index for fast queries
create index if not exists idx_coins_creator on coins(creator);
create index if not exists idx_trades_mint on trades(mint);
