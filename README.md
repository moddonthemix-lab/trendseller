# Reseller Edge AI

A private sourcing and reselling intelligence platform for one reseller. Every morning it answers:
**what to buy, where to buy it, the expected profit, how fast it sells, and why it's an opportunity right now.**

Built with Next.js (App Router) · React · TypeScript · TailwindCSS · Supabase (Postgres + Auth) · Vercel · Claude.

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

## Going live

1. **Supabase**: create a project, run `supabase/migrations/0001_init.sql` (SQL editor or `supabase db push`), then set
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   Set `ALLOWED_EMAILS` to your email. Once configured, every page requires sign-in (magic link). After your first sign-in, disable new sign-ups in Supabase Auth settings.
2. **Claude**: set `ANTHROPIC_API_KEY` to enable the AI assistant and photo identification.
3. **Location**: set `HOME_LAT` / `HOME_LNG` for distance calculations.
4. **Deals**: set `CRON_SECRET` (Vercel sends it to the cron automatically), `ALERT_USER_ID` (your Supabase user id) and `DEAL_WEBHOOK_URL` (an `https://ntfy.sh/<topic>` URL, Discord or Slack webhook) for phone notifications. The schedule is in `vercel.json` (daily; Pro plans can run it more often).
5. **Data**: seed the database, then feed it real data:

```bash
# Load the sample catalog into Supabase (first-time setup)
curl -X POST https://<your-app>/api/ingest -H "Authorization: Bearer $INGEST_SECRET" \
  -H "Content-Type: application/json" -d '{"seedSample": true}'
```

`POST /api/ingest` accepts `products` (with `history`), daily `metrics` for existing products, and local `listings`; it re-scores everything and appends a row to `product_score_history`, so history is kept. See the zod schema in `src/app/api/ingest/route.ts` for the exact shape.

### Data sources

The app ships with **no live marketplace scrapers**. Sold-listing data isn't available from public APIs (eBay's Marketplace Insights API needs approval) and scraping Facebook Marketplace/OfferUp breaks their terms. Any collector you run (eBay Browse/Insights API, Terapeak exports, a Google Sheet, your own tooling) can push into `/api/ingest` on a schedule.

## Project layout

```
src/
  app/                 pages + API routes (assistant, identify, scan, ingest, cron/deals)
  components/          UI (dashboard widgets, scanner, inventory, assistant chat)
  lib/domain/types.ts  core types & categories
  lib/scoring/         opportunity, trend, profit, hidden gems, heat map, arbitrage, deals, buy verdict, brief, modes
  lib/data/            sample catalog/generator, Supabase mappers & repository
  lib/ai/              Claude client, market context for prompts, rule-based fallback
  lib/supabase/        browser/server/admin clients
  proxy.ts             auth gate (active only when Supabase is configured)
supabase/migrations/   Postgres schema with RLS
```

## Roadmap

- **Phase 2**: voice sourcing assistant, receipt scanning, automated repricing, sourcing route planner, estate/garage sale analyzer
- **Phase 3**: predictive trend forecasting, AI-generated sourcing plans, automated daily reports, personal sourcing scorecards (`product_score_history` + inventory already capture what these need)
