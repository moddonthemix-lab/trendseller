import type { LocalListing, Product } from "@/lib/domain/types";
import type { GeoPoint } from "@/lib/scoring/arbitrage";
import { findArbitrage } from "@/lib/scoring/arbitrage";
import { maxBuyForRoi } from "@/lib/scoring/brief";
import { marketHeatMap } from "@/lib/scoring/heatmap";
import { segmentAlerts } from "@/lib/scoring/hiddenGems";
import { rankOpportunities } from "@/lib/scoring/opportunity";

/**
 * Compact, model-friendly snapshot of the market that the sourcing assistant reasons over.
 * Everything here is computed by our own scoring, so the model grounds recommendations in data.
 */
export function marketContext(products: Product[], listings: LocalListing[], home?: GeoPoint): string {
  const ranked = rankOpportunities(products);
  const lines: string[] = [];
  lines.push("## Tracked products (ranked by opportunity score)");
  lines.push("score | product | brand | category | avg sold | typical source cost | max buy for 100% ROI | est profit | STR | days to sell | 30d trend | where to find");
  for (const a of ranked) {
    const p = a.product;
    lines.push(
      [
        a.opportunityScore,
        p.name,
        p.brand,
        p.category,
        `$${Math.round(p.avgSoldPrice)}`,
        `$${p.typicalSourcePrice}`,
        `$${maxBuyForRoi(p)}`,
        `$${Math.round(a.profit.netProfit)}`,
        `${Math.round(a.sellThrough * 100)}%`,
        Math.round(p.avgDaysToSell),
        `${Math.round(a.trend.change30d * 100)}%`,
        p.bestSources.join("/"),
      ].join(" | "),
    );
  }
  lines.push("", "## Hidden gem alerts (7-day vs 30-day)");
  for (const s of segmentAlerts(products)) lines.push(`- ${s.headline}`);
  lines.push("", "## Category heat (0-100; competition: higher = more crowded)");
  for (const h of marketHeatMap(products)) lines.push(`- ${h.label}: heat ${h.heat}, demand ${h.demand}, profit ${h.profitability}, competition ${h.competition}`);
  const arb = findArbitrage(listings, products, { home, maxDistance: 40, minProfit: 20 }).slice(0, 10);
  if (arb.length) {
    lines.push("", "## Underpriced local listings right now");
    for (const o of arb)
      lines.push(
        `- ${o.listing.title} — $${o.listing.price} on ${o.listing.source} in ${o.listing.city}${o.distanceMiles !== null ? ` (${o.distanceMiles.toFixed(1)} mi)` : ""}; market $${Math.round(o.marketValue)}, est profit $${Math.round(o.profit.netProfit)}`,
      );
  }
  return lines.join("\n");
}
