# Reseller Edge AI

A private sourcing and reselling intelligence platform for one reseller. Every morning it answers:
**what to buy, where to buy it, the expected profit, how fast it sells, and why it's an opportunity right now.**

Built with Next.js (App Router) · React · TypeScript · TailwindCSS · Supabase (Postgres + Auth) · Railway · Claude.

## What's in it

| Screen | What it does |
| --- | --- |
| **Today** (`/`) | Morning brief (buy list with where / max price / profit / days to sell / why), today's best opportunities, hidden gem alerts, market heat map |
| **Scanner** (`/scanner`) | Mobile-first. Scan a barcode (UPC/EAN/ISBN) with the camera, type a code, search, or take a photo (Claude vision). Enter the shelf price and get sold price, sell-through, fees, shipping, profit, buy score and a **BUY / MAYBE / PASS** verdict |
| **Local** (`/arbitrage`) | Local listings matched to sold-market value. Shows market value − asking price, profit after fees, distance, opportunity score |
| **Ask AI** (`/assistant`) | Sourcing assistant ("I have $200 to spend at Goodwill"). Streams Claude answers grounded in the scored market snapshot; falls back to a rule-based planner without an API key |
| **Inventory** (`/inventory`) | Purchase → listing → sale tracking with fees, shipping, net profit. Monthly revenue & profit, average ROI, sell-through, unsold inventory value |
| **Product DB** (`/products`, `/products/[id]`) | Product intelligence database: sold avg/high/low, active count & price, sell-through, shipping, trend, score. 90-day chart, score breakdown, max buy price, profit calculator |
| **Hidden Gems** (`/gems`) | 7-day metrics vs 30-day average: demand spike, price spike, reduced supply, sell-through increase, search spike |
| **Deal Detector** (`/deals`, `/api/cron/deals`) | Flags deals with ROI > 100% **or** profit > $50 **or** score > 90 and pushes notifications |
| **Modes** (`/modes/audio`, `/modes/camera`, `/modes/gaming`) | Specialised views: fastest movers, best margins, emerging trends, below-market / rare-model / demand-increase alerts |

## Algorithms (all in `src/lib/scoring`, unit-tested)

**Opportunity score (0–100)** — `opportunity.ts`. Each factor is normalised to 0–100, then weighted:

| Factor | Weight | Normalisation |
| --- | --- | --- |
| Sell-through (sold 30d ÷ active) | 35% | 150% STR = 100 |
| Profit margin (net profit ÷ purchase price) | 25% | 300% ROI = 100 |
| Trend growth (7/30/90-day price change, blended 50/30/20) | 20% | −30% → 0, +30% → 100 |
| Competition (active listings & distinct sellers, log scale) | 10% | 1 listing = 100, 1000+ = 0 |
| Avg days to sell | 10% | 3 days = 100, 60 days = 0 |

**Profit** — `profit.ts`: eBay 13.25% + $0.40, Mercari 10% + $0.50, Poshmark 20% (≥ $15) / $2.95, Reverb 8.19% + $0.49, Facebook local 0%. Edit `FEE_SCHEDULES` if fees change.

**Hidden gems** — `hiddenGems.ts`: 7-day avg vs 30-day avg. Thresholds: demand +20%, price +12%, supply −15%, sell-through +20%, search +25%. Segment alerts ("Vintage digital cameras up 24% this week") aggregate products by segment.

**Buy verdict** — `buyScore.ts`: PASS if profit < $5 or ROI < 30%; BUY if buy score ≥ 70 with ≥ $15 profit and ≥ 50% STR (or ≥ $100 profit at ≥ 100% ROI with ≥ 40% STR); otherwise MAYBE/PASS.

**Heat map** — `heatmap.ts`: per-category demand, profitability and competition (0–100), ranked by a composite heat score.

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # scoring unit tests
npm run build
```

With no environment variables the app runs fully on a built-in **sample market** (≈60 realistic products with 90 days of generated history plus sample local listings), stores inventory in your browser, and uses the rule-based assistant. A banner tells you when you're looking at sample data.

## Going live (Railway)

1. **Supabase**: create a project and run the migrations in `supabase/migrations/` in order (SQL editor or `supabase db push`).
   Under *Authentication → URL Configuration*, set the Site URL to your Railway URL and add `https://<your-app>.up.railway.app/auth/callback` as a redirect URL.
2. **Web service**: in Railway, *New Project → Deploy from GitHub repo* and pick this repo. `railway.json` sets the build (`npm run build`), start command (`npm start`) and health check (`/api/health`). Under *Settings → Networking*, generate a domain.
3. **Variables** (on the web service; see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_URL` = your Railway URL, `ALLOWED_EMAILS` = your email
   - `ANTHROPIC_API_KEY` (AI assistant + photo ID), `HOME_LAT` / `HOME_LNG` (distances)
   - `INGEST_SECRET`, `CRON_SECRET` (any long random strings), `ALERT_USER_ID` (your Supabase user id), `DEAL_WEBHOOK_URL` (an `https://ntfy.sh/<topic>` URL, Discord or Slack webhook) for phone notifications

   `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them. Once Supabase is configured every page requires sign-in (magic link). After your first sign-in, turn off new sign-ups in Supabase Auth settings.
4. **Daily cron**: add a second service from the same repo. In its *Settings*, set the *Config-as-code* path to `/railway.cron.json` and give it the variables `APP_URL` and `CRON_SECRET` (same values as the web service; you can use Railway variable references). It runs `scripts/daily-cron.mjs` daily at 11:00 UTC, which calls `/api/cron/collect` (free data sources) then `/api/cron/deals` (deal alerts) and exits. Edit `cronSchedule` in `railway.cron.json` to change the time.
5. **Data**: seed the database, then feed it real data:

```bash
# Load the sample catalog into Supabase (first-time setup)
curl -X POST https://<your-app>.up.railway.app/api/ingest -H "Authorization: Bearer $INGEST_SECRET" \
  -H "Content-Type: application/json" -d '{"seedSample": true}'
```

`POST /api/ingest` accepts `products` (with `history`), daily `metrics` for existing products, and local `listings`; it re-scores everything and appends a row to `product_score_history`, so history is kept. See the zod schema in `src/app/api/ingest/route.ts` for the exact shape.

### Data sources

**Built in, no account or key needed:**

| Source | Used for | Limits |
| --- | --- | --- |
| [Discogs](https://www.discogs.com/developers) | Records, CDs, cassettes: lowest listed price, number for sale, collectors' want/have. Scanner barcode lookup (shows every pressing that shares a barcode) and daily snapshots for linked products | 25 requests/min (set `DISCOGS_TOKEN` for 60/min) |
| [TCGdex](https://tcgdex.dev) | Pokémon cards: TCGplayer market/low/high, Cardmarket 1/7/30-day averages | none published |
| [Scryfall](https://scryfall.com/docs/api) | Magic: The Gathering card prices (TCGplayer, Cardmarket) | ~10 requests/sec |
| [UPCitemdb](https://www.upcitemdb.com/wp/docs/main/development/getting-started/) | Scanner: name/brand/model/category for any barcode, plus retail price range | 100 lookups/day, 6/min per IP |
| [Open Library](https://openlibrary.org/developers/api) | Scanner: book title/author from an ISBN (no prices) | fair use |

Link a product to these with `refs` (`discogsReleaseId`, `tcgdexCardId`, `scryfallId`) when sending it to `/api/ingest`. The product page then shows a *Live market data* panel, and the daily collector stores one row per product, source and day in `external_snapshots`, so history builds up. Discogs prices are asking prices, not sold prices, and the app labels them that way.

**Need a free sign-up (not wired in yet):** eBay Browse API (active listings, competition, supply for every category), eBay Marketplace Insights (real sold prices; requires approval), BrickEconomy (LEGO values and forecasts, 100 calls/day).

**Paid:** PriceCharting (video game sold values and sales volume), Keepa (Amazon price history).

eBay has shown sold/completed listings only to signed-in users since July 2026, so scraping sold prices without an account no longer works.

## Project layout

```
src/
  app/                 pages + API routes (assistant, identify, scan, ingest, cron/deals)
  components/          UI (dashboard widgets, scanner, inventory, assistant chat)
  lib/domain/types.ts  core types & categories
  lib/scoring/         opportunity, trend, profit, hidden gems, heat map, arbitrage, deals, buy verdict, brief, modes
  lib/data/            sample catalog/generator, Supabase mappers & repository
  lib/ai/              Claude client, market context for prompts, rule-based fallback
  lib/sources/         free data sources (Discogs, TCGdex, Scryfall, UPCitemdb, Open Library)
  lib/supabase/        browser/server/admin clients
  proxy.ts             auth gate (active only when Supabase is configured)
scripts/daily-cron.mjs     Railway cron entry point (data collection + deal detector)
railway.json         web service config  ·  railway.cron.json  cron service config
supabase/migrations/   Postgres schema with RLS
```

## Roadmap

- **Phase 2**: voice sourcing assistant, receipt scanning, automated repricing, sourcing route planner, estate/garage sale analyzer
- **Phase 3**: predictive trend forecasting, AI-generated sourcing plans, automated daily reports, personal sourcing scorecards (`product_score_history` + inventory already capture what these need)
