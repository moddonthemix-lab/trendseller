import { describe, expect, it } from "vitest";
import { sampleMarket, sampleProducts } from "@/lib/data/sample";
import type { DailyMetric, Product } from "@/lib/domain/types";
import { distanceMiles, findArbitrage, matchListing } from "./arbitrage";
import { maxBuyForRoi, morningBrief } from "./brief";
import { buyVerdict } from "./buyScore";
import { DEAL_RULES, detectDeals } from "./deals";
import { marketHeatMap } from "./heatmap";
import { detectGem, findHiddenGems, segmentAlerts } from "./hiddenGems";
import { inventoryMetrics, netProfit } from "./inventory";
import { OPPORTUNITY_WEIGHTS, analyzeProduct, opportunityScore, rankOpportunities } from "./opportunity";
import { calculateProfit, marketplaceFees } from "./profit";
import { priceTrend } from "./trend";

const NOW = new Date("2026-09-30T12:00:00Z");

function flatHistory(days: number, over: Partial<DailyMetric> = {}, last7: Partial<DailyMetric> = {}): DailyMetric[] {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10),
    avgSoldPrice: 100,
    soldCount: 2,
    activeCount: 50,
    avgDaysToSell: 7,
    searchVolume: 100,
    ...over,
    ...(i >= days - 7 ? last7 : {}),
  }));
}

function product(over: Partial<Product> = {}): Product {
  return {
    id: "p",
    name: "Test",
    brand: "B",
    category: "electronics",
    segment: "Seg",
    modes: [],
    keywords: ["test", "thing"],
    avgSoldPrice: 100,
    highSoldPrice: 150,
    lowSoldPrice: 60,
    avgActivePrice: 90,
    activeListings: 50,
    soldListings: 60,
    sellerCount: 40,
    avgShippingCost: 10,
    avgDaysToSell: 7,
    typicalSourcePrice: 15,
    bestSources: ["Goodwill"],
    history: flatHistory(90),
    ...over,
  };
}

describe("profit", () => {
  it("applies eBay fees", () => {
    expect(marketplaceFees(100, "ebay")).toBeCloseTo(13.65);
    const p = calculateProfit({ salePrice: 100, purchasePrice: 20, shippingCost: 10 });
    expect(p.netProfit).toBeCloseTo(100 - 13.65 - 10 - 20);
    expect(p.roi).toBeCloseTo(p.netProfit / 20, 3);
  });
  it("uses Poshmark flat fee under $15", () => {
    expect(marketplaceFees(10, "poshmark")).toBe(2.95);
    expect(marketplaceFees(100, "poshmark")).toBe(20);
  });
  it("local sales have no fees or shipping", () => {
    expect(calculateProfit({ salePrice: 50, purchasePrice: 10, shippingCost: 12, marketplace: "facebook" }).netProfit).toBe(40);
  });
});

describe("opportunity score", () => {
  it("weights sum to 1", () => {
    expect(Object.values(OPPORTUNITY_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("is bounded 0–100 and rewards each factor", () => {
    const base = { soldListings: 30, activeListings: 60, expectedProfit: 20, purchasePrice: 20, trendGrowth: 0, avgDaysToSell: 14 };
    const s = opportunityScore(base).score;
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(100);
    expect(opportunityScore({ ...base, soldListings: 90 }).score).toBeGreaterThan(s);
    expect(opportunityScore({ ...base, expectedProfit: 60 }).score).toBeGreaterThan(s);
    expect(opportunityScore({ ...base, trendGrowth: 0.2 }).score).toBeGreaterThan(s);
    expect(opportunityScore({ ...base, activeListings: 10, soldListings: 5 }).factors.competition).toBeGreaterThan(
      opportunityScore(base).factors.competition,
    );
    expect(opportunityScore({ ...base, avgDaysToSell: 3 }).score).toBeGreaterThan(s);
    const perfect = opportunityScore({ soldListings: 500, activeListings: 1, expectedProfit: 1000, purchasePrice: 1, trendGrowth: 1, avgDaysToSell: 1 });
    expect(perfect.score).toBe(100);
  });
  it("ranks the spec's Walkman example near the top of the sample data", () => {
    const ranked = rankOpportunities(sampleProducts(NOW));
    const idx = ranked.findIndex((a) => a.product.id === "sony-wm-fx195");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(10);
    expect(ranked[idx].trendDirection).toBe("up");
    expect(ranked[0].opportunityScore).toBeGreaterThanOrEqual(ranked[ranked.length - 1].opportunityScore);
  });
});

describe("trend", () => {
  it("detects a rising price", () => {
    const h = flatHistory(90).map((d, i) => ({ ...d, avgSoldPrice: 100 + i }));
    const t = priceTrend(h);
    expect(t.direction).toBe("up");
    expect(t.change90d).toBeGreaterThan(t.change30d);
    expect(t.change30d).toBeGreaterThan(t.change7d);
  });
  it("is flat for flat history", () => {
    expect(priceTrend(flatHistory(90)).direction).toBe("flat");
  });
});

describe("hidden gems", () => {
  it("flags demand, price and supply spikes vs the 30-day average", () => {
    const p = product({ history: flatHistory(90, {}, { soldCount: 4, avgSoldPrice: 125, activeCount: 30, searchVolume: 200 }) });
    const gem = detectGem(p)!;
    expect(gem.signals).toEqual(expect.arrayContaining(["demand-spike", "price-spike", "reduced-supply", "sell-through-increase", "search-spike"]));
  });
  it("ignores flat products", () => {
    expect(detectGem(product())).toBeNull();
  });
  it("produces segment alerts on sample data", () => {
    const products = sampleProducts(NOW);
    expect(findHiddenGems(products).length).toBeGreaterThan(3);
    const alerts = segmentAlerts(products);
    expect(alerts.some((a) => a.segment === "Vintage digital cameras")).toBe(true);
    for (const a of alerts) expect(a.headline).toMatch(/%/);
  });
});

describe("heat map", () => {
  it("covers every category with bounded scores", () => {
    const rows = marketHeatMap(sampleProducts(NOW));
    expect(rows).toHaveLength(10);
    for (const r of rows) for (const v of [r.demand, r.profitability, r.competition, r.heat]) expect(v).toBeGreaterThanOrEqual(0);
    expect(rows[0].heat).toBeGreaterThanOrEqual(rows[rows.length - 1].heat);
  });
});

describe("scanner buy verdict", () => {
  const p = analyzeProduct(sampleProducts(NOW).find((x) => x.id === "canon-powershot-sd1000")!).product;
  it("says BUY at thrift prices and PASS near market value", () => {
    expect(buyVerdict(p, 8).decision).toBe("BUY");
    expect(buyVerdict(p, p.avgSoldPrice).decision).toBe("PASS");
  });
});

describe("arbitrage + deals", () => {
  const { products, localListings } = sampleMarket(NOW);
  it("matches listing titles to products", () => {
    expect(matchListing("Old Sony Walkman cassette player WM-FX195 works", products)?.id).toBe("sony-wm-fx195");
    expect(matchListing("Yamaha NS-10 studio monitors pair - NS10M", products)?.id).toBe("yamaha-ns10m");
    expect(matchListing("random couch", products)).toBeUndefined();
  });
  it("computes distance", () => {
    expect(distanceMiles({ lat: 34, lng: -118 }, { lat: 35, lng: -118 })).toBeCloseTo(69.1, 0);
  });
  it("finds profitable underpriced listings", () => {
    const opps = findArbitrage(localListings, products, { home: { lat: 34.0522, lng: -118.2437 } });
    expect(opps.length).toBeGreaterThan(5);
    for (const o of opps) expect(o.marketValue).toBeGreaterThan(0);
  });
  it("applies the deal rules", () => {
    const deals = detectDeals(localListings, products);
    expect(deals.length).toBeGreaterThan(0);
    for (const d of deals) {
      const ok = d.profit.roi > DEAL_RULES.minRoi || d.profit.netProfit > DEAL_RULES.minProfit || d.opportunityScore > DEAL_RULES.minScore;
      expect(ok).toBe(true);
    }
  });
  it("builds a morning brief answering what/where/profit/speed/why", () => {
    const brief = morningBrief(products, localListings, { lat: 34.0522, lng: -118.2437 });
    expect(brief.length).toBe(8);
    for (const b of brief) {
      expect(b.where).not.toBe("");
      expect(b.why.length).toBeGreaterThan(0);
      expect(b.daysToSell).toBeGreaterThan(0);
    }
    expect(brief[0].kind).toBe("local-deal");
  });
  it("max buy price yields ≥100% ROI", () => {
    const p = products[0];
    const max = maxBuyForRoi(p);
    expect(analyzeProduct(p, { purchasePrice: max }).profit.roi).toBeGreaterThanOrEqual(1);
  });
});

describe("inventory metrics", () => {
  it("computes monthly revenue, profit, ROI, STR and unsold value", () => {
    const items = [
      { id: "1", name: "A", category: "cameras" as const, purchaseDate: "2026-09-01", purchasePrice: 10, sourceLocation: "Goodwill", listingDate: "2026-09-02", saleDate: "2026-09-10", salePrice: 100, shippingCost: 8, marketplace: "ebay" as const },
      { id: "2", name: "B", category: "audio" as const, purchaseDate: "2026-09-05", purchasePrice: 40, sourceLocation: "FB", listingDate: "2026-09-06", listPrice: 150 },
      { id: "3", name: "C", category: "toys" as const, purchaseDate: "2026-08-01", purchasePrice: 5, sourceLocation: "Garage", saleDate: "2026-08-20", salePrice: 30, fees: 4, shippingCost: 5 },
    ];
    const m = inventoryMetrics(items, NOW);
    expect(m.monthlyRevenue).toBe(100);
    expect(m.monthlyProfit).toBeCloseTo(netProfit(items[0])!);
    expect(m.sellThroughRate).toBeCloseTo(2 / 3, 3);
    expect(m.unsoldInventoryValue).toBe(40);
    expect(m.unsoldListValue).toBe(150);
    expect(netProfit(items[2])).toBe(16);
  });
});
