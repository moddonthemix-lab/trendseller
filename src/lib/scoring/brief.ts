import type { LocalListing, Product } from "@/lib/domain/types";
import type { GeoPoint } from "./arbitrage";
import { findArbitrage } from "./arbitrage";
import { rankOpportunities } from "./opportunity";

export interface BriefItem {
  what: string;
  productId: string;
  where: string;
  /** Max price to pay (keeps ROI ≥ 100% after fees & shipping). */
  maxBuyPrice: number;
  expectedProfit: number;
  daysToSell: number;
  why: string[];
  score: number;
  kind: "local-deal" | "source";
}

/** The highest price at which netProfit ≥ purchasePrice (ROI ≥ 100%) on eBay. */
export function maxBuyForRoi(p: Product, targetRoi = 1): number {
  const net = p.avgSoldPrice * (1 - 0.1325) - 0.4 - p.avgShippingCost;
  return Math.max(0, Math.floor(net / (1 + targetRoi)));
}

/**
 * The morning answer: what to buy, where, expected profit, how fast it sells, and why.
 * Concrete local listings come first, then the best items to hunt for in stores.
 */
export function morningBrief(products: Product[], listings: LocalListing[], home?: GeoPoint, limit = 8): BriefItem[] {
  const deals = findArbitrage(listings, products, { home, maxDistance: 40, minProfit: 25 })
    .slice(0, 3)
    .map<BriefItem>((d) => ({
      what: d.product.name,
      productId: d.product.id,
      where: `${d.listing.source} · ${d.listing.city}${d.distanceMiles !== null ? ` (${d.distanceMiles.toFixed(1)} mi)` : ""} — listed $${d.listing.price}`,
      maxBuyPrice: d.listing.price,
      expectedProfit: Math.round(d.profit.netProfit),
      daysToSell: Math.round(d.product.avgDaysToSell),
      why: [`Listed ${Math.round(d.discount * 100)}% under the $${Math.round(d.marketValue)} sold average`],
      score: d.opportunityScore,
      kind: "local-deal",
    }));
  const seen = new Set(deals.map((d) => d.productId));
  const sourcing = rankOpportunities(products)
    .filter((a) => !seen.has(a.product.id) && a.trendDirection !== "down")
    .slice(0, Math.max(0, limit - deals.length))
    .map<BriefItem>((a) => ({
      what: a.product.name,
      productId: a.product.id,
      where: a.product.bestSources.slice(0, 3).join(", "),
      maxBuyPrice: maxBuyForRoi(a.product),
      expectedProfit: Math.round(a.profit.netProfit),
      daysToSell: Math.round(a.product.avgDaysToSell),
      why: a.reasons.slice(0, 3),
      score: a.opportunityScore,
      kind: "source",
    }));
  return [...deals, ...sourcing];
}
