import type { Product } from "@/lib/domain/types";
import { clamp } from "./math";
import { analyzeProduct, type ProductAnalysis } from "./opportunity";

export type BuyDecision = "BUY" | "MAYBE" | "PASS";

export interface BuyVerdict {
  decision: BuyDecision;
  buyScore: number;
  analysis: ProductAnalysis;
  rationale: string;
}

/**
 * In-store buy decision for a specific shelf price. Starts from the opportunity score
 * (computed at *this* price) and adds hard floors so a hot item with no margin still passes.
 */
export function buyVerdict(product: Product, askingPrice: number): BuyVerdict {
  const analysis = analyzeProduct(product, { purchasePrice: askingPrice });
  const { netProfit, roi } = analysis.profit;
  const dollarBonus = clamp(netProfit / 100) * 15; // big-ticket profit matters even at lower ROI
  const buyScore = Math.round(clamp(analysis.opportunityScore * 0.85 + dollarBonus, 0, 100));

  let decision: BuyDecision;
  if (netProfit < 5 || roi < 0.3) decision = "PASS";
  else if (buyScore >= 70 && netProfit >= 15 && analysis.sellThrough >= 0.5) decision = "BUY";
  // Big-ticket wins: a $100+ flip at ≥100% ROI with steady demand is a buy even if the score is middling.
  else if (netProfit >= 100 && roi >= 1 && analysis.sellThrough >= 0.4) decision = "BUY";
  else if (buyScore >= 50 || netProfit >= 40) decision = "MAYBE";
  else decision = "PASS";

  const days = Math.round(product.avgDaysToSell);
  const rationale =
    decision === "BUY"
      ? `Clears ~$${netProfit.toFixed(0)} (${Math.round(roi * 100)}% ROI) and typically sells in ${days} days.`
      : decision === "MAYBE"
        ? `~$${netProfit.toFixed(0)} profit but ${analysis.sellThrough < 0.5 ? "slow sell-through" : "thin score"} — buy only if condition is excellent.`
        : netProfit < 5
          ? `Only ~$${netProfit.toFixed(0)} after fees and shipping.`
          : `Weak demand/margin for this price (${Math.round(roi * 100)}% ROI).`;

  return { decision, buyScore, analysis, rationale };
}
