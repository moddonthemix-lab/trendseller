import type { CategoryId, Product } from "@/lib/domain/types";
import { mean, pctChange } from "./math";
import { windowAvg } from "./trend";

export type GemSignal = "demand-spike" | "price-spike" | "reduced-supply" | "sell-through-increase" | "search-spike";

/** Minimum 7-day vs 30-day change for each signal to fire. */
export const GEM_THRESHOLDS: Record<GemSignal, number> = {
  "demand-spike": 0.2,
  "price-spike": 0.12,
  "reduced-supply": -0.15,
  "sell-through-increase": 0.2,
  "search-spike": 0.25,
};

export interface GemMetrics {
  price: number;
  demand: number;
  supply: number;
  sellThrough: number;
  search: number;
}

export interface ProductGem {
  product: Product;
  /** 7-day average vs 30-day average, as fractions. */
  changes: GemMetrics;
  signals: GemSignal[];
  /** Strength used for ranking: sum of how far each fired signal exceeded its threshold. */
  strength: number;
}

const str = (sold: number, active: number) => (active > 0 ? sold / active : 0);

export function gemChanges(p: Product): GemMetrics {
  const h = p.history;
  const s7 = windowAvg(h, "soldCount", 7);
  const s30 = windowAvg(h, "soldCount", 30);
  const a7 = windowAvg(h, "activeCount", 7);
  const a30 = windowAvg(h, "activeCount", 30);
  return {
    price: pctChange(windowAvg(h, "avgSoldPrice", 30), windowAvg(h, "avgSoldPrice", 7)),
    demand: pctChange(s30, s7),
    supply: pctChange(a30, a7),
    sellThrough: pctChange(str(s30, a30), str(s7, a7)),
    search: pctChange(windowAvg(h, "searchVolume", 30), windowAvg(h, "searchVolume", 7)),
  };
}

const SIGNAL_METRIC: Record<GemSignal, keyof GemMetrics> = {
  "demand-spike": "demand",
  "price-spike": "price",
  "reduced-supply": "supply",
  "sell-through-increase": "sellThrough",
  "search-spike": "search",
};

export function detectGem(p: Product): ProductGem | null {
  if (p.history.length < 30) return null;
  const changes = gemChanges(p);
  const signals: GemSignal[] = [];
  let strength = 0;
  for (const signal of Object.keys(GEM_THRESHOLDS) as GemSignal[]) {
    const value = changes[SIGNAL_METRIC[signal]];
    const threshold = GEM_THRESHOLDS[signal];
    const fired = threshold < 0 ? value <= threshold : value >= threshold;
    if (fired) {
      signals.push(signal);
      strength += Math.abs(value) / Math.abs(threshold);
    }
  }
  return signals.length ? { product: p, changes, signals, strength } : null;
}

export function findHiddenGems(products: Product[]): ProductGem[] {
  return products
    .map(detectGem)
    .filter((g): g is ProductGem => g !== null)
    .sort((a, b) => b.strength - a.strength);
}

export interface SegmentAlert {
  segment: string;
  category: CategoryId;
  metric: "price" | "demand" | "sellThrough" | "search";
  /** Fractional change, 7-day vs 30-day average. */
  change: number;
  period: "7 days";
  headline: string;
  productIds: string[];
}

const METRIC_PHRASE: Record<SegmentAlert["metric"], (pct: number) => string> = {
  price: (pct) => `up ${pct}% this week`,
  demand: (pct) => `selling ${pct}% more this week`,
  sellThrough: (pct) => `selling ${pct}% faster`,
  search: (pct) => `search interest up ${pct}%`,
};

const SEGMENT_THRESHOLD: Record<SegmentAlert["metric"], number> = {
  price: GEM_THRESHOLDS["price-spike"],
  demand: GEM_THRESHOLDS["demand-spike"],
  sellThrough: GEM_THRESHOLDS["sell-through-increase"],
  search: GEM_THRESHOLDS["search-spike"],
};

/** Aggregates gem signals into segment-level alerts like "Vintage digital cameras up 24% this week". */
export function segmentAlerts(products: Product[], minChange = 0.12): SegmentAlert[] {
  const bySegment = new Map<string, Product[]>();
  for (const p of products) {
    if (p.history.length < 30) continue;
    bySegment.set(p.segment, [...(bySegment.get(p.segment) ?? []), p]);
  }
  const alerts: SegmentAlert[] = [];
  for (const [segment, items] of bySegment) {
    const changes = items.map(gemChanges);
    const candidates: [SegmentAlert["metric"], number][] = [
      ["price", mean(changes.map((c) => c.price))],
      ["sellThrough", mean(changes.map((c) => c.sellThrough))],
      ["demand", mean(changes.map((c) => c.demand))],
      ["search", mean(changes.map((c) => c.search))],
    ];
    // Pick the metric that moved most relative to its own alert threshold.
    const rel = (c: [SegmentAlert["metric"], number]) => c[1] / SEGMENT_THRESHOLD[c[0]];
    const [metric, change] = candidates.reduce((best, c) => (rel(c) > rel(best) ? c : best));
    if (change < SEGMENT_THRESHOLD[metric] * (minChange / 0.12)) continue;
    const pct = Math.round(change * 100);
    alerts.push({
      segment,
      category: items[0].category,
      metric,
      change,
      period: "7 days",
      headline: `${segment} ${METRIC_PHRASE[metric](pct)}`,
      productIds: items.map((i) => i.id),
    });
  }
  return alerts.sort((a, b) => b.change - a.change);
}
