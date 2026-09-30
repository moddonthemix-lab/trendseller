import type { DailyMetric, TrendDirection } from "@/lib/domain/types";
import { mean, pctChange } from "./math";

export interface PriceTrend {
  change7d: number;
  change30d: number;
  change90d: number;
  /** Blended growth used by the opportunity score (fraction). */
  blended: number;
  direction: TrendDirection;
}

/** Average of `key` over the `days` most recent entries, offset back by `offset` days. */
export function windowAvg(history: DailyMetric[], key: keyof Omit<DailyMetric, "date">, days: number, offset = 0): number {
  const end = history.length - offset;
  const start = Math.max(0, end - days);
  return mean(history.slice(start, Math.max(start, end)).map((d) => d[key]));
}

/**
 * Price movement over 7/30/90 days. Each horizon compares the latest 7-day average
 * price with the 7-day average price N days ago, which smooths out single-sale noise.
 */
export function priceTrend(history: DailyMetric[]): PriceTrend {
  const now = windowAvg(history, "avgSoldPrice", 7);
  const at = (daysAgo: number) => {
    const offset = Math.min(daysAgo, Math.max(0, history.length - 7));
    return windowAvg(history, "avgSoldPrice", 7, offset);
  };
  const change7d = pctChange(at(7), now);
  const change30d = pctChange(at(30), now);
  const change90d = pctChange(at(83), now);
  const blended = 0.5 * change7d + 0.3 * change30d + 0.2 * change90d;
  const direction: TrendDirection = blended > 0.03 ? "up" : blended < -0.03 ? "down" : "flat";
  return { change7d, change30d, change90d, blended, direction };
}
