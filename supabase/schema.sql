-- Public metadata cache only. Solana accounts are the source of truth.
-- No profiles, email addresses, private keys, seed phrases, or trader tracking.
create table if not exists public.coins (
  mint text primary key,
  creator text not null,
  name text not null,
  symbol text not null,
  uri text,
  created_at timestamptz not null default now(),
  is_revoked boolean not null default false,
  is_burned boolean not null default false,
  holder_count integer not null default 0 check (holder_count >= 0)
);

create index if not exists coins_created_at_idx on public.coins(created_at desc);
create index if not exists coins_creator_idx on public.coins(creator);

alter table public.coins enable row level security;
drop policy if exists "Coins are publicly readable cache rows" on public.coins;
create policy "Coins are publicly readable cache rows" on public.coins for select using (true);
-- No anonymous INSERT/UPDATE/DELETE policy. A trusted indexer/service role should
-- update the cache from confirmed chain events. Never expose a service-role key.
