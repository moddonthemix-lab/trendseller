-- Free live-data sources (Discogs, TCGdex, Scryfall).
-- products.external_refs links a product to its ids on those sites;
-- external_snapshots keeps one row per product/source/day so history is retained.

alter table public.products add column if not exists external_refs jsonb not null default '{}'::jsonb;

create table if not exists public.external_snapshots (
  product_id text not null references public.products(id) on delete cascade,
  source text not null check (source in ('discogs', 'tcgdex', 'scryfall', 'upcitemdb', 'openlibrary')),
  date date not null,
  data jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (product_id, source, date)
);
create index if not exists external_snapshots_date_idx on public.external_snapshots (date);

alter table public.external_snapshots enable row level security;
create policy "external snapshots readable by signed-in user" on public.external_snapshots for select to authenticated using (true);
