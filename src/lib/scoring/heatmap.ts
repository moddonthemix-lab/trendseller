import { CATEGORIES, type CategoryId, type Product } from "@/lib/domain/types";
import { clamp, mean } from "./math";
import { analyzeProduct } from "./opportunity";

export interface CategoryHeat {
  category: CategoryId;
  label: string;
  /** 0–100, higher = more demand (sell-through, velocity, trend). */
  demand: number;
  /** 0–100, higher = more profitable (ROI and dollar profit). */
  profitability: number;
  /** 0–100, higher = MORE competition (bad). */
  competition: number;
  /** Composite 0–100 used for ranking. */
  heat: number;
  avgOpportunity: number;
  productCount: number;
}

export function marketHeatMap(products: Product[]): CategoryHeat[] {
  const rows: CategoryHeat[] = [];
  for (const c of CATEGORIES) {
    const items = products.filter((p) => p.category === c.id);
    if (!items.length) continue;
    const analyses = items.map((p) => analyzeProduct(p));
    const demand =
      mean(analyses.map((a) => 0.5 * a.factors.sellThrough + 0.25 * a.factors.daysToSell + 0.25 * a.factors.trendGrowth));
    const profitability = mean(
      analyses.map((a) => 0.6 * clamp(a.profit.roi / 3) * 100 + 0.4 * clamp(a.profit.netProfit / 150) * 100),
    );
    const competition = 100 - mean(analyses.map((a) => a.factors.competition));
    const heat = 0.45 * demand + 0.4 * profitability + 0.15 * (100 - competition);
    rows.push({
      category: c.id,
      label: c.label,
      demand: Math.round(demand),
      profitability: Math.round(profitability),
      competition: Math.round(competition),
      heat: Math.round(heat),
      avgOpportunity: Math.round(mean(analyses.map((a) => a.opportunityScore))),
      productCount: items.length,
    });
  }
  return rows.sort((a, b) => b.heat - a.heat);
}
