import type { LocalListing, Product } from "@/lib/domain/types";
import { clamp } from "./math";
import { analyzeProduct } from "./opportunity";
import type { ProfitBreakdown } from "./profit";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Great-circle distance in miles. */
export function distanceMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Match a free-text listing title to a catalog product. Each product lists keywords;
 * a product matches when all of its "required" keywords (the first two) appear, and the
 * best match is the one with the most keyword hits.
 */
export function matchListing(title: string, products: Product[]): Product | undefined {
  const t = ` ${normalize(title)} `;
  let best: { p: Product; hits: number } | undefined;
  for (const p of products) {
    const kws = p.keywords.map(normalize);
    if (!kws.length) continue;
    const required = kws.slice(0, 2);
    if (!required.every((k) => t.includes(` ${k} `) || t.includes(k))) continue;
    const hits = kws.filter((k) => t.includes(k)).length;
    if (!best || hits > best.hits) best = { p, hits };
  }
  return best?.p;
}

export interface ArbitrageOpportunity {
  listing: LocalListing;
  product: Product;
  marketValue: number;
  /** marketValue − listing price */
  spread: number;
  discount: number;
  profit: ProfitBreakdown;
  distanceMiles: number | null;
  opportunityScore: number;
}

export function findArbitrage(
  listings: LocalListing[],
  products: Product[],
  opts: { home?: GeoPoint; maxDistance?: number; minProfit?: number } = {},
): ArbitrageOpportunity[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: ArbitrageOpportunity[] = [];
  for (const listing of listings) {
    const product = (listing.productId && byId.get(listing.productId)) || matchListing(listing.title, products);
    if (!product) continue;
    const dist = opts.home ? distanceMiles(opts.home, listing) : null;
    if (dist !== null && opts.maxDistance !== undefined && dist > opts.maxDistance) continue;
    const analysis = analyzeProduct(product, { purchasePrice: listing.price });
    if (analysis.profit.netProfit < (opts.minProfit ?? 0)) continue;
    const discount = product.avgSoldPrice > 0 ? 1 - listing.price / product.avgSoldPrice : 0;
    // Distance penalty: lose up to 10 points for a 50-mile drive.
    const distancePenalty = dist === null ? 0 : clamp(dist / 50) * 10;
    const score = Math.round(clamp(analysis.opportunityScore + clamp(discount) * 10 - distancePenalty, 0, 100));
    out.push({
      listing: { ...listing, productId: product.id },
      product,
      marketValue: product.avgSoldPrice,
      spread: product.avgSoldPrice - listing.price,
      discount,
      profit: analysis.profit,
      distanceMiles: dist,
      opportunityScore: score,
    });
  }
  return out.sort((a, b) => b.opportunityScore - a.opportunityScore || b.profit.netProfit - a.profit.netProfit);
}
