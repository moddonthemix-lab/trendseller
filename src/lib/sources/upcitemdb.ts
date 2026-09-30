import "server-only";
import { getJson } from "./http";

/** UPCitemdb free "trial" endpoint: no key, 100 requests/day and 6/minute per IP. */
const BASE = "https://api.upcitemdb.com/prod/trial";

interface UpcResponse {
  code: string;
  items?: {
    title: string;
    brand?: string;
    model?: string;
    category?: string;
    description?: string;
    images?: string[];
    lowest_recorded_price?: number;
    highest_recorded_price?: number;
    offers?: { merchant: string; price: number; condition?: string; updated_t?: number }[];
  }[];
}

export interface UpcProduct {
  source: "upcitemdb";
  title: string;
  brand?: string;
  model?: string;
  category?: string;
  image?: string;
  /** Retail prices seen at online stores (new condition) — a ceiling, not a resale value. */
  lowestRecordedPrice?: number;
  highestRecordedPrice?: number;
  offerCount: number;
}

export async function lookupUpc(code: string): Promise<UpcProduct | null> {
  const data = await getJson<UpcResponse>("UPCitemdb", `${BASE}/lookup?upc=${encodeURIComponent(code)}`, { ttlMs: 7 * 86_400_000 });
  const item = data.items?.[0];
  if (!item) return null;
  return {
    source: "upcitemdb",
    title: item.title,
    brand: item.brand || undefined,
    model: item.model || undefined,
    category: item.category || undefined,
    image: item.images?.[0],
    lowestRecordedPrice: item.lowest_recorded_price || undefined,
    highestRecordedPrice: item.highest_recorded_price || undefined,
    offerCount: item.offers?.length ?? 0,
  };
}
