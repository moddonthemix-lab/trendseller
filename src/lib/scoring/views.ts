import type { ArbView } from "@/components/ArbitrageTable";
import type { ArbitrageOpportunity } from "./arbitrage";
import type { Deal } from "./deals";

export function toArbView(o: ArbitrageOpportunity, dealIds: Set<string> = new Set()): ArbView {
  return {
    id: o.listing.id,
    title: o.listing.title,
    source: o.listing.source,
    city: o.listing.city,
    url: o.listing.url,
    postedAt: o.listing.postedAt,
    price: o.listing.price,
    productId: o.product.id,
    productName: o.product.name,
    marketValue: o.marketValue,
    discount: o.discount,
    profit: o.profit.netProfit,
    roi: o.profit.roi,
    distance: o.distanceMiles,
    score: o.opportunityScore,
    isDeal: dealIds.has(o.listing.id),
  };
}

export const dealIdSet = (deals: Deal[]) => new Set(deals.map((d) => d.listing.id));
