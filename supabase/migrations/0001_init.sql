-- Reseller Edge AI — initial schema
-- Market data (products, daily metrics, local listings) is shared & written by the service role.
-- Personal data (inventory, alerts) is owned per user via RLS.

create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text not null,
  category text not null check (category in (
    'electronics','cameras','audio','gaming','toys','collectibles','musical','vintage-clothing','sneakers','tools')),
  segment text not null,
  modes text[] not null default '{}',
  upc text,
  keywords text[] not null default '{}',
  avg_sold_price numeric(10,2) not null default 0,
  high_sold_price numeric(10,2) not null default 0,
  low_sold_price numeric(10,2) not null default 0,
  avg_active_price numeric(10,2) not null default 0,
  active_listings integer not null default 0,
  sold_listings integer not null default 0,
  seller_count integer not null default 0,
  avg_shipping_cost numeric(10,2) not null default 0,
  avg_days_to_sell numeric(6,1) not null default 0,
  typical_source_price numeric(10,2) not null default 0,
  best_sources text[] not null default '{}',
  -- Denormalised scores, refreshed by /api/ingest so the DB can be queried/sorted directly.
  sell_through_rate numeric(8,4),
  trend_score numeric(8,4),
  opportunity_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists products_upc_idx on public.products (upc) where upc is not null;
create index if not exists products_category_idx on public.products (category);
create index if not exists products_opportunity_idx on public.products (opportunity_score desc);

-- Historical data is retained: one row per product per day, never overwritten except same-day upserts.
create table if not exists public.product_daily_metrics (
  product_id text not null references public.products(id) on delete cascade,
  date date not null,
  avg_sold_price numeric(10,2) not null,
  sold_count numeric(10,2) not null,
  active_count integer not null,
  avg_days_to_sell numeric(6,1) not null,
  search_volume numeric(10,1) not null default 0,
  primary key (product_id, date)
);
create index if not exists product_daily_metrics_date_idx on public.product_daily_metrics (date);

-- Snapshot of computed scores over time (for scorecards / backtesting).
create table if not exists public.product_score_history (
  product_id text not null references public.products(id) on delete cascade,
  scored_on date not null default current_date,
  opportunity_score integer not null,
  trend_score numeric(8,4) not null,
  sell_through_rate numeric(8,4) not null,
  avg_sold_price numeric(10,2) not null,
  primary key (product_id, scored_on)
);

create table if not exists public.local_listings (
  id text primary key,
  source text not null,
  title text not null,
  price numeric(10,2) not null,
  url text,
  lat double precision not null,
  lng double precision not null,
  city text not null default '',
  posted_at timestamptz not null default now(),
  product_id text references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists local_listings_posted_idx on public.local_listings (posted_at desc);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  product_id text references public.products(id) on delete set null,
  purchase_date date not null,
  purchase_price numeric(10,2) not null,
  source_location text not null default '',
  listing_date date,
  list_price numeric(10,2),
  sale_date date,
  sale_price numeric(10,2),
  shipping_cost numeric(10,2),
  fees numeric(10,2),
  marketplace text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists inventory_items_user_idx on public.inventory_items (user_id, purchase_date desc);

create table if not exists public.alerts (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  detail text not null,
  product_id text references public.products(id) on delete set null,
  listing_id text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  primary key (user_id, id)
);

alter table public.products enable row level security;
alter table public.product_daily_metrics enable row level security;
alter table public.product_score_history enable row level security;
alter table public.local_listings enable row level security;
alter table public.inventory_items enable row level security;
alter table public.alerts enable row level security;

create policy "market data readable by signed-in user" on public.products for select to authenticated using (true);
create policy "metrics readable by signed-in user" on public.product_daily_metrics for select to authenticated using (true);
create policy "score history readable by signed-in user" on public.product_score_history for select to authenticated using (true);
create policy "local listings readable by signed-in user" on public.local_listings for select to authenticated using (true);

create policy "own inventory" on public.inventory_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own alerts" on public.alerts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
