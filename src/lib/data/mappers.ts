import type { CategoryId, DailyMetric, LocalListing, Product, ProductRefs, SourceVenue } from "@/lib/domain/types";

/* Row shapes mirror supabase/migrations/0001_init.sql. Numerics arrive as numbers or strings. */
type Num = number | string | null;
const n = (v: Num) => (v === null ? 0 : Number(v));

export interface ProductRow {
  id: string;
  name: string;
  brand: string;
  category: string;
  segment: string;
  modes: string[];
  upc: string | null;
  keywords: string[];
  avg_sold_price: Num;
  high_sold_price: Num;
  low_sold_price: Num;
  avg_active_price: Num;
  active_listings: number;
  sold_listings: number;
  seller_count: number;
  avg_shipping_cost: Num;
  avg_days_to_sell: Num;
  typical_source_price: Num;
  best_sources: string[];
  external_refs?: ProductRefs | null;
  sell_through_rate?: Num;
  trend_score?: Num;
  opportunity_score?: number | null;
}

export interface MetricRow {
  product_id: string;
  date: string;
  avg_sold_price: Num;
  sold_count: Num;
  active_count: number;
  avg_days_to_sell: Num;
  search_volume: Num;
}

export interface LocalListingRow {
  id: string;
  source: string;
  title: string;
  price: Num;
  url: string | null;
  lat: number;
  lng: number;
  city: string;
  posted_at: string;
  product_id: string | null;
}

export function productFromRow(r: ProductRow, history: DailyMetric[]): Product {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    category: r.category as CategoryId,
    segment: r.segment,
    modes: r.modes as Product["modes"],
    upc: r.upc ?? undefined,
    keywords: r.keywords,
    avgSoldPrice: n(r.avg_sold_price),
    highSoldPrice: n(r.high_sold_price),
    lowSoldPrice: n(r.low_sold_price),
    avgActivePrice: n(r.avg_active_price),
    activeListings: r.active_listings,
    soldListings: r.sold_listings,
    sellerCount: r.seller_count,
    avgShippingCost: n(r.avg_shipping_cost),
    avgDaysToSell: n(r.avg_days_to_sell),
    typicalSourcePrice: n(r.typical_source_price),
    bestSources: r.best_sources as SourceVenue[],
    history,
    ...(r.external_refs && Object.keys(r.external_refs).length > 0 && { refs: r.external_refs }),
  };
}

export function productToRow(p: Product, scores?: { sellThrough: number; trend: number; opportunity: number }): ProductRow {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    segment: p.segment,
    modes: p.modes,
    upc: p.upc ?? null,
    keywords: p.keywords,
    avg_sold_price: p.avgSoldPrice,
    high_sold_price: p.highSoldPrice,
    low_sold_price: p.lowSoldPrice,
    avg_active_price: p.avgActivePrice,
    active_listings: p.activeListings,
    sold_listings: p.soldListings,
    seller_count: p.sellerCount,
    avg_shipping_cost: p.avgShippingCost,
    avg_days_to_sell: p.avgDaysToSell,
    typical_source_price: p.typicalSourcePrice,
    best_sources: p.bestSources,
    external_refs: p.refs ?? {},
    ...(scores && {
      sell_through_rate: scores.sellThrough,
      trend_score: scores.trend,
      opportunity_score: scores.opportunity,
    }),
  };
}

export const metricFromRow = (r: MetricRow): DailyMetric => ({
  date: r.date,
  avgSoldPrice: n(r.avg_sold_price),
  soldCount: n(r.sold_count),
  activeCount: r.active_count,
  avgDaysToSell: n(r.avg_days_to_sell),
  searchVolume: n(r.search_volume),
});

export const metricToRow = (productId: string, m: DailyMetric): MetricRow => ({
  product_id: productId,
  date: m.date,
  avg_sold_price: m.avgSoldPrice,
  sold_count: m.soldCount,
  active_count: m.activeCount,
  avg_days_to_sell: m.avgDaysToSell,
  search_volume: m.searchVolume,
});

export const listingFromRow = (r: LocalListingRow): LocalListing => ({
  id: r.id,
  source: r.source as LocalListing["source"],
  title: r.title,
  price: n(r.price),
  url: r.url ?? undefined,
  lat: r.lat,
  lng: r.lng,
  city: r.city,
  postedAt: r.posted_at,
  productId: r.product_id ?? undefined,
});

export const listingToRow = (l: LocalListing): LocalListingRow => ({
  id: l.id,
  source: l.source,
  title: l.title,
  price: l.price,
  url: l.url ?? null,
  lat: l.lat,
  lng: l.lng,
  city: l.city,
  posted_at: l.postedAt,
  product_id: l.productId ?? null,
});
