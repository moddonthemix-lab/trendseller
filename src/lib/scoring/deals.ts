import type { Alert, LocalListing, Product } from "@/lib/domain/types";
import { findArbitrage, type ArbitrageOpportunity, type GeoPoint } from "./arbitrage";

/** Alert rules from the spec: ROI > 100% OR profit > $50 OR opportunity score > 90. */
export const DEAL_RULES = { minRoi: 1, minProfit: 50, minScore: 90 } as const;

export interface Deal extends ArbitrageOpportunity {
  triggers: ("roi" | "profit" | "score")[];
}

export function detectDeals(
  listings: LocalListing[],
  products: Product[],
  opts: { home?: GeoPoint; maxDistance?: number; rules?: Partial<typeof DEAL_RULES> } = {},
): Deal[] {
  const rules = { ...DEAL_RULES, ...opts.rules };
  return findArbitrage(listings, products, { home: opts.home, maxDistance: opts.maxDistance, minProfit: 0.01 })
    .map((o) => {
      const triggers: Deal["triggers"] = [];
      if (o.profit.roi > rules.minRoi) triggers.push("roi");
      if (o.profit.netProfit > rules.minProfit) triggers.push("profit");
      if (o.opportunityScore > rules.minScore) triggers.push("score");
      return { ...o, triggers };
    })
    .filter((d) => d.triggers.length > 0);
}

export function dealToAlert(d: Deal, now = new Date()): Alert {
  const dist = d.distanceMiles !== null ? ` · ${d.distanceMiles.toFixed(1)} mi` : "";
  return {
    id: `deal-${d.listing.id}`,
    kind: "deal",
    title: `${d.product.name} for $${d.listing.price} (${d.listing.source})`,
    detail: `Market $${Math.round(d.marketValue)} · est. profit $${Math.round(d.profit.netProfit)} · ROI ${Math.round(d.profit.roi * 100)}% · score ${d.opportunityScore}${dist}`,
    productId: d.product.id,
    listingId: d.listing.id,
    createdAt: now.toISOString(),
  };
}
