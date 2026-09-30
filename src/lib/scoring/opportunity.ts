import type { Marketplace, Product, TrendDirection } from "@/lib/domain/types";
import { clamp, round } from "./math";
import { calculateProfit, type ProfitBreakdown } from "./profit";
import { priceTrend, type PriceTrend } from "./trend";

/** Weights from the spec. They sum to 1. */
export const OPPORTUNITY_WEIGHTS = {
  sellThrough: 0.35,
  profitMargin: 0.25,
  trendGrowth: 0.2,
  competition: 0.1,
  daysToSell: 0.1,
} as const;

export type FactorKey = keyof typeof OPPORTUNITY_WEIGHTS;

/** Each factor normalised to 0–100 before weighting. */
export type FactorScores = Record<FactorKey, number>;

// Normalisation anchors — the value at which a factor maxes out (or bottoms out).
const STR_CAP = 1.5; // 150% sold/active ratio = perfect
const ROI_CAP = 3; // 300% ROI = perfect
const TREND_SPAN = 0.3; // -30% → 0, +30% → 100
const COMPETITION_LISTINGS_ZERO = 1000; // 1000+ active listings = saturated
const DAYS_FAST = 3;
const DAYS_SLOW = 60;

export const sellThroughRate = (sold: number, active: number) => (active > 0 ? sold / active : sold > 0 ? STR_CAP : 0);

export function scoreSellThrough(str: number) {
  return clamp(str / STR_CAP) * 100;
}

export function scoreProfitMargin(roi: number) {
  return clamp(roi / ROI_CAP) * 100;
}

export function scoreTrend(blendedGrowth: number) {
  return clamp((blendedGrowth + TREND_SPAN) / (2 * TREND_SPAN)) * 100;
}

/** Fewer active listings (and fewer distinct sellers) → higher score, on a log scale. */
export function scoreCompetition(activeListings: number, sellerCount?: number) {
  const listings = 1 - clamp(Math.log10(Math.max(1, activeListings)) / Math.log10(COMPETITION_LISTINGS_ZERO));
  if (sellerCount === undefined) return listings * 100;
  const sellers = 1 - clamp(Math.log10(Math.max(1, sellerCount)) / Math.log10(COMPETITION_LISTINGS_ZERO / 2));
  return (0.6 * listings + 0.4 * sellers) * 100;
}

export function scoreDaysToSell(days: number) {
  return clamp(1 - (days - DAYS_FAST) / (DAYS_SLOW - DAYS_FAST)) * 100;
}

export interface OpportunityInput {
  soldListings: number;
  activeListings: number;
  sellerCount?: number;
  expectedProfit: number;
  purchasePrice: number;
  trendGrowth: number;
  avgDaysToSell: number;
}

export function opportunityScore(input: OpportunityInput): { score: number; factors: FactorScores } {
  const roi = input.purchasePrice > 0 ? input.expectedProfit / input.purchasePrice : input.expectedProfit > 0 ? ROI_CAP : 0;
  const factors: FactorScores = {
    sellThrough: scoreSellThrough(sellThroughRate(input.soldListings, input.activeListings)),
    profitMargin: scoreProfitMargin(roi),
    trendGrowth: scoreTrend(input.trendGrowth),
    competition: scoreCompetition(input.activeListings, input.sellerCount),
    daysToSell: scoreDaysToSell(input.avgDaysToSell),
  };
  const score = (Object.keys(OPPORTUNITY_WEIGHTS) as FactorKey[]).reduce(
    (sum, k) => sum + factors[k] * OPPORTUNITY_WEIGHTS[k],
    0,
  );
  return {
    score: Math.round(clamp(score, 0, 100)),
    factors: Object.fromEntries(Object.entries(factors).map(([k, v]) => [k, Math.round(v)])) as FactorScores,
  };
}

export interface ProductAnalysis {
  product: Product;
  sellThrough: number;
  trend: PriceTrend;
  trendDirection: TrendDirection;
  /** Profit assuming you buy at the product's typical sourcing price. */
  profit: ProfitBreakdown;
  opportunityScore: number;
  factors: FactorScores;
  /** Human-readable reasons this is (or isn't) an opportunity. */
  reasons: string[];
}

const pct = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n * 100)}%`;

export function explain(p: Product, a: Omit<ProductAnalysis, "reasons" | "product">): string[] {
  const reasons: string[] = [];
  if (a.sellThrough >= 1) reasons.push(`Sells through at ${Math.round(a.sellThrough * 100)}% — more sold than listed in 30 days`);
  else if (a.sellThrough >= 0.6) reasons.push(`Healthy ${Math.round(a.sellThrough * 100)}% sell-through`);
  if (a.trend.change7d >= 0.08) reasons.push(`Sold prices ${pct(a.trend.change7d)} over the last 7 days`);
  else if (a.trend.change30d >= 0.1) reasons.push(`Sold prices ${pct(a.trend.change30d)} over 30 days`);
  if (a.profit.roi >= 1) reasons.push(`${Math.round(a.profit.roi * 100)}% ROI at a typical $${p.typicalSourcePrice} sourcing price`);
  if (p.activeListings < 40) reasons.push(`Only ${p.activeListings} active listings — thin competition`);
  if (p.avgDaysToSell <= 7) reasons.push(`Sells in ~${Math.round(p.avgDaysToSell)} days on average`);
  if (p.avgActivePrice < p.avgSoldPrice * 0.75) reasons.push(`Active listings average $${Math.round(p.avgActivePrice)} vs $${Math.round(p.avgSoldPrice)} sold — cheap supply is getting absorbed`);
  if (a.trend.direction === "down") reasons.push(`Caution: prices trending down (${pct(a.trend.blended)} blended)`);
  return reasons;
}

export function analyzeProduct(
  product: Product,
  opts: { purchasePrice?: number; marketplace?: Marketplace } = {},
): ProductAnalysis {
  const purchasePrice = opts.purchasePrice ?? product.typicalSourcePrice;
  const trend = priceTrend(product.history);
  const profit = calculateProfit({
    salePrice: product.avgSoldPrice,
    purchasePrice,
    shippingCost: product.avgShippingCost,
    marketplace: opts.marketplace,
  });
  const sellThrough = round(sellThroughRate(product.soldListings, product.activeListings), 4);
  const { score, factors } = opportunityScore({
    soldListings: product.soldListings,
    activeListings: product.activeListings,
    sellerCount: product.sellerCount,
    expectedProfit: profit.netProfit,
    purchasePrice,
    trendGrowth: trend.blended,
    avgDaysToSell: product.avgDaysToSell,
  });
  const base = { sellThrough, trend, trendDirection: trend.direction, profit, opportunityScore: score, factors };
  return { product, ...base, reasons: explain(product, base) };
}

export function rankOpportunities(products: Product[]): ProductAnalysis[] {
  return products.map((p) => analyzeProduct(p)).sort((a, b) => b.opportunityScore - a.opportunityScore);
}
