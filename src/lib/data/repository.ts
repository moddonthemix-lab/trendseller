import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyMetric, LocalListing, Product } from "@/lib/domain/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_HOME } from "./localListings";
import { listingFromRow, metricFromRow, productFromRow, type LocalListingRow, type MetricRow, type ProductRow } from "./mappers";
import { sampleMarket } from "./sample";

export interface MarketData {
  products: Product[];
  localListings: LocalListing[];
  /** "sample" when Supabase isn't configured, the user isn't signed in, or the tables are empty. */
  source: "sample" | "supabase";
  home: { lat: number; lng: number };
}

export function homeLocation() {
  const lat = Number(process.env.HOME_LAT);
  const lng = Number(process.env.HOME_LNG);
  return Number.isFinite(lat) && Number.isFinite(lng) && process.env.HOME_LAT ? { lat, lng } : DEFAULT_HOME;
}

export async function loadMarketFromSupabase(db: SupabaseClient, days = 90): Promise<Omit<MarketData, "home"> | null> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const [productsRes, listingsRes] = await Promise.all([
    db.from("products").select("*"),
    db.from("local_listings").select("*").order("posted_at", { ascending: false }).limit(500),
  ]);
  if (productsRes.error || !productsRes.data?.length) return null;

  // Page through metrics — PostgREST caps each response.
  const metrics: MetricRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("product_daily_metrics")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return null;
    metrics.push(...(data as MetricRow[]));
    if (!data || data.length < PAGE) break;
  }
  const byProduct = new Map<string, DailyMetric[]>();
  for (const m of metrics) byProduct.set(m.product_id, [...(byProduct.get(m.product_id) ?? []), metricFromRow(m)]);

  return {
    products: (productsRes.data as ProductRow[]).map((r) => productFromRow(r, byProduct.get(r.id) ?? [])),
    localListings: ((listingsRes.data ?? []) as LocalListingRow[]).map(listingFromRow),
    source: "supabase",
  };
}

/** Loads the market snapshot the whole app renders from. */
export async function getMarketData(): Promise<MarketData> {
  const home = homeLocation();
  const db = await createSupabaseServerClient();
  if (db) {
    const live = await loadMarketFromSupabase(db).catch(() => null);
    if (live) return { ...live, home };
  }
  return { ...sampleMarket(new Date(), home), source: "sample", home };
}
