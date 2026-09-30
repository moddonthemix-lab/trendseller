import { z } from "zod";
import { hasBearer } from "@/lib/auth";
import { listingToRow, metricToRow, productToRow } from "@/lib/data/mappers";
import { sampleMarket, todayUtc } from "@/lib/data/sample";
import { CATEGORIES, type DailyMetric, type LocalListing, type Product } from "@/lib/domain/types";
import { matchListing } from "@/lib/scoring/arbitrage";
import { analyzeProduct } from "@/lib/scoring/opportunity";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { loadMarketFromSupabase } from "@/lib/data/repository";

export const runtime = "nodejs";
export const maxDuration = 300;

const Metric = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  avgSoldPrice: z.number().nonnegative(),
  soldCount: z.number().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  avgDaysToSell: z.number().nonnegative(),
  searchVolume: z.number().nonnegative().default(0),
});

const ProductIn = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string(),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]]),
  segment: z.string(),
  modes: z.array(z.enum(["audio", "camera", "gaming"])).default([]),
  upc: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  avgSoldPrice: z.number(),
  highSoldPrice: z.number(),
  lowSoldPrice: z.number(),
  avgActivePrice: z.number(),
  activeListings: z.number().int(),
  soldListings: z.number().int(),
  sellerCount: z.number().int(),
  avgShippingCost: z.number(),
  avgDaysToSell: z.number(),
  typicalSourcePrice: z.number(),
  bestSources: z.array(z.string()).default([]),
  history: z.array(Metric).default([]),
  refs: z
    .object({ discogsReleaseId: z.number().int().optional(), tcgdexCardId: z.string().optional(), scryfallId: z.string().optional() })
    .optional(),
});

const Listing = z.object({
  id: z.string().min(1),
  source: z.enum(["Facebook Marketplace", "Craigslist", "OfferUp", "Nextdoor"]),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  url: z.string().url().optional(),
  lat: z.number(),
  lng: z.number(),
  city: z.string().default(""),
  postedAt: z.string(),
  productId: z.string().optional(),
});

const Body = z.object({
  /** Load the built-in sample catalog (first-time setup / demos). */
  seedSample: z.boolean().optional(),
  products: z.array(ProductIn).max(2000).default([]),
  /** Extra daily rows for existing products (e.g. a nightly scraper). */
  metrics: z.array(Metric.extend({ productId: z.string() })).max(50_000).default([]),
  listings: z.array(Listing).max(5000).default([]),
});

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => PromiseLike<{ error: unknown }>) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await fn(rows.slice(i, i + size));
    if (error) throw error;
  }
}

/**
 * Market data feed. POST products (with history), daily metrics and/or local listings;
 * scores are recomputed and a score snapshot is appended to product_score_history.
 */
export async function POST(req: Request) {
  if (!hasBearer(req, process.env.INGEST_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = createSupabaseAdminClient();
  if (!db) return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 501 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid body", issues: parsed.error.issues.slice(0, 10) }, { status: 400 });

  let products = parsed.data.products as unknown as Product[];
  let listings = parsed.data.listings as LocalListing[];
  if (parsed.data.seedSample) {
    const sample = sampleMarket();
    products = [...products, ...sample.products];
    listings = [...listings, ...sample.localListings];
  }

  try {
    await chunked(products.map((p) => productToRow(p)), 500, (c) => db.from("products").upsert(c));
    await chunked(
      products.flatMap((p) => p.history.map((m) => metricToRow(p.id, m))),
      1000,
      (c) => db.from("product_daily_metrics").upsert(c),
    );
    await chunked(
      parsed.data.metrics.map(({ productId, ...m }) => metricToRow(productId, m as DailyMetric)),
      1000,
      (c) => db.from("product_daily_metrics").upsert(c),
    );

    // Re-score everything from the stored history so denormalised columns stay consistent.
    const market = await loadMarketFromSupabase(db);
    const all = market?.products ?? [];
    const scoredOn = todayUtc().toISOString().slice(0, 10);
    const scored = all.map((p) => ({ p, a: analyzeProduct(p) }));
    await chunked(
      scored.map(({ p, a }) => productToRow(p, { sellThrough: a.sellThrough, trend: a.trend.blended, opportunity: a.opportunityScore })),
      500,
      (c) => db.from("products").upsert(c),
    );
    await chunked(
      scored.map(({ p, a }) => ({
        product_id: p.id,
        scored_on: scoredOn,
        opportunity_score: a.opportunityScore,
        trend_score: a.trend.blended,
        sell_through_rate: a.sellThrough,
        avg_sold_price: p.avgSoldPrice,
      })),
      500,
      (c) => db.from("product_score_history").upsert(c),
    );

    const matched = listings.map((l) => ({ ...l, productId: l.productId ?? matchListing(l.title, all)?.id }));
    await chunked(matched.map(listingToRow), 500, (c) => db.from("local_listings").upsert(c));

    return Response.json({ ok: true, products: products.length, metrics: parsed.data.metrics.length, listings: listings.length, rescored: scored.length });
  } catch (err) {
    console.error("ingest failed", err);
    return Response.json({ error: "Ingest failed" }, { status: 500 });
  }
}
