import "server-only";
import { getJson } from "./http";

/**
 * Discogs public API, used without a token (25 requests/minute). Covers records, CDs and
 * cassettes. Prices are *asking* prices on the Discogs marketplace, not sold prices.
 * Setting DISCOGS_TOKEN later raises the limit to 60/minute.
 */
const BASE = "https://api.discogs.com";
const auth = () => (process.env.DISCOGS_TOKEN ? { Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}` } : undefined);

interface SearchResponse {
  results: { id: number; title: string; year?: string; format?: string[]; country?: string; thumb?: string; community?: { want: number; have: number } }[];
}

interface ReleaseResponse {
  id: number;
  title: string;
  year?: number;
  artists_sort?: string;
  formats?: { name: string; descriptions?: string[] }[];
  num_for_sale?: number;
  lowest_price?: number | null;
  community?: { want: number; have: number; rating?: { average: number; count: number } };
  uri?: string;
}

export interface DiscogsRelease {
  source: "discogs";
  releaseId: number;
  title: string;
  year?: number;
  format?: string;
  numForSale: number;
  /** Cheapest current listing (USD). */
  lowestPrice?: number;
  have: number;
  want: number;
  /** want ÷ have — above ~1 means more collectors want it than own it. */
  demandRatio: number;
  url: string;
}

export async function discogsRelease(releaseId: number): Promise<DiscogsRelease> {
  const r = await getJson<ReleaseResponse>("Discogs", `${BASE}/releases/${releaseId}`, { headers: auth(), ttlMs: 3_600_000 });
  const have = r.community?.have ?? 0;
  const want = r.community?.want ?? 0;
  return {
    source: "discogs",
    releaseId: r.id,
    title: r.artists_sort ? `${r.artists_sort} – ${r.title}` : r.title,
    year: r.year || undefined,
    format: r.formats?.map((f) => [f.name, ...(f.descriptions ?? [])].join(" ")).join(", "),
    numForSale: r.num_for_sale ?? 0,
    lowestPrice: r.lowest_price ?? undefined,
    have,
    want,
    demandRatio: have > 0 ? Math.round((want / have) * 100) / 100 : want > 0 ? want : 0,
    url: r.uri ?? `https://www.discogs.com/release/${r.id}`,
  };
}

export interface DiscogsMatch {
  releaseId: number;
  title: string;
  year?: string;
  format?: string;
  country?: string;
  have: number;
  want: number;
}

async function search(params: string): Promise<DiscogsMatch[]> {
  const data = await getJson<SearchResponse>("Discogs", `${BASE}/database/search?${params}&type=release&per_page=5`, { headers: auth(), ttlMs: 86_400_000 });
  return data.results.map((r) => ({
    releaseId: r.id,
    title: r.title,
    year: r.year,
    format: r.format?.join(", "),
    country: r.country,
    have: r.community?.have ?? 0,
    want: r.community?.want ?? 0,
  }));
}

export const discogsByBarcode = (barcode: string) => search(`barcode=${encodeURIComponent(barcode)}`);
export const discogsSearch = (query: string) => search(`q=${encodeURIComponent(query)}`);
