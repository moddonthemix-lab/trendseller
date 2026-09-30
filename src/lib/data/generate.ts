import type { DailyMetric, Product } from "@/lib/domain/types";
import { mean, round } from "@/lib/scoring/math";
import type { CatalogSpec } from "./catalog";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Small deterministic PRNG so sample data is stable between renders. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 90;

/**
 * Builds 90 days of history ending `today` whose most recent values land on the spec's
 * current price / volume, with the 90-day drift and last-7-day spikes baked in.
 */
export function generateHistory(spec: CatalogSpec, today: Date): DailyMetric[] {
  const rand = mulberry32(hash(spec.id));
  const noise = (amp: number) => 1 + (rand() * 2 - 1) * amp;
  const out: DailyMetric[] = [];
  const priceNow = spec.price;
  const priceBeforeSpike = priceNow / (1 + (spec.spike ?? 0));
  const priceStart = priceBeforeSpike / (1 + spec.drift);
  const soldBase = spec.soldDay / (1 + (spec.demand7 ?? 0));
  const activeBase = spec.active / (1 + (spec.supply7 ?? 0));
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (DAYS - 1 - i));
    const inSpike = i >= DAYS - 7;
    const t = Math.min(1, i / (DAYS - 8));
    const price = (inSpike ? priceNow : priceStart + (priceBeforeSpike - priceStart) * t) * noise(0.04);
    const sold = (inSpike ? spec.soldDay : soldBase) * noise(0.25);
    const active = (inSpike ? spec.active : activeBase) * noise(0.05);
    const search = 100 * (inSpike ? 1 + (spec.search7 ?? 0) : 1) * noise(0.1);
    const days = spec.days * noise(0.15);
    out.push({
      date: date.toISOString().slice(0, 10),
      avgSoldPrice: round(price),
      soldCount: round(Math.max(0, sold), 2),
      activeCount: Math.max(0, Math.round(active)),
      avgDaysToSell: round(days, 1),
      searchVolume: round(search, 1),
    });
  }
  return out;
}

export function productFromSpec(spec: CatalogSpec, index: number, today: Date): Product {
  const history = generateHistory(spec, today);
  const last30 = history.slice(-30);
  const prices = last30.map((d) => d.avgSoldPrice);
  const rand = mulberry32(hash(spec.id + "x"));
  const avgSold = round(mean(prices));
  return {
    id: spec.id,
    name: spec.name,
    brand: spec.brand,
    category: spec.category,
    segment: spec.segment,
    modes: spec.modes ?? [],
    upc: `99${String(100000000 + index * 7919).padStart(10, "0")}`,
    keywords: spec.keywords,
    avgSoldPrice: avgSold,
    highSoldPrice: round(Math.max(...prices) * (1.15 + rand() * 0.2)),
    lowSoldPrice: round(Math.min(...prices) * (0.6 + rand() * 0.15)),
    // Active listings skew lower than sold when cheap supply is being absorbed.
    avgActivePrice: round(avgSold * (spec.spike || (spec.demand7 ?? 0) > 0.2 ? 0.62 + rand() * 0.1 : 0.95 + rand() * 0.15)),
    activeListings: history[history.length - 1].activeCount,
    soldListings: Math.round(last30.reduce((s, d) => s + d.soldCount, 0)),
    sellerCount: spec.sellers ?? Math.max(1, Math.round(spec.active * (0.7 + rand() * 0.2))),
    avgShippingCost: spec.ship,
    avgDaysToSell: round(mean(last30.map((d) => d.avgDaysToSell)), 1),
    typicalSourcePrice: spec.source,
    bestSources: spec.venues,
    history,
    ...(spec.refs && { refs: spec.refs }),
  };
}
