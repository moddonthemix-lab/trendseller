import type { Alert, LocalListing, Mode, Product } from "@/lib/domain/types";
import { findArbitrage, type GeoPoint } from "./arbitrage";
import { findHiddenGems } from "./hiddenGems";
import { analyzeProduct, type ProductAnalysis } from "./opportunity";

export const MODE_CONFIG: Record<Mode, { title: string; blurb: string; tracks: string[] }> = {
  audio: {
    title: "Audio Equipment Mode",
    blurb: "Pro audio, outboard and instruments — your home turf.",
    tracks: ["Yamaha mixers", "Outboard gear", "Rack processors", "Vintage microphones", "Studio monitors", "Synthesizers", "Drum machines"],
  },
  camera: {
    title: "Camera Mode",
    blurb: "Compact digital cameras are having a moment — track the models driving it.",
    tracks: ["Canon PowerShot", "Sony Cyber-shot", "Nikon Coolpix", "Fujifilm"],
  },
  gaming: {
    title: "Gaming Mode",
    blurb: "Retro consoles, handhelds and games.",
    tracks: ["Retro consoles", "Nintendo", "PlayStation", "Xbox", "Handheld systems"],
  },
};

export const isMode = (m: string): m is Mode => m in MODE_CONFIG;

/** A model is "rare" when fewer than 10 sell per month and supply is thin. */
export const isRare = (p: Product) => p.soldListings < 10 && p.activeListings <= 20;

export interface ModeReport {
  products: ProductAnalysis[];
  fastestMovers: ProductAnalysis[];
  bestMargins: ProductAnalysis[];
  emerging: ProductAnalysis[];
  alerts: Alert[];
  byGroup: { group: string; items: ProductAnalysis[] }[];
}

export function modeReport(mode: Mode, products: Product[], listings: LocalListing[], home?: GeoPoint, now = new Date()): ModeReport {
  const inMode = products.filter((p) => p.modes.includes(mode));
  const analyses = inMode.map((p) => analyzeProduct(p)).sort((a, b) => b.opportunityScore - a.opportunityScore);
  const gemIds = new Set(findHiddenGems(inMode).map((g) => g.product.id));
  const alerts: Alert[] = [];
  const createdAt = now.toISOString();

  for (const o of findArbitrage(listings, inMode, { home, maxDistance: 60 })) {
    if (o.discount >= 0.25)
      alerts.push({
        id: `below-${o.listing.id}`,
        kind: "below-market",
        title: `${o.product.name} listed ${Math.round(o.discount * 100)}% below market`,
        detail: `$${o.listing.price} on ${o.listing.source} (${o.listing.city}) vs $${Math.round(o.marketValue)} sold avg — est. profit $${Math.round(o.profit.netProfit)}`,
        productId: o.product.id,
        listingId: o.listing.id,
        createdAt,
      });
    if (isRare(o.product))
      alerts.push({
        id: `rare-${o.listing.id}`,
        kind: "rare-model",
        title: `Rare model appeared: ${o.product.name}`,
        detail: `Only ${o.product.activeListings} listed nationally, ~${o.product.soldListings} sell per month. Local: $${o.listing.price} in ${o.listing.city}.`,
        productId: o.product.id,
        listingId: o.listing.id,
        createdAt,
      });
  }
  for (const g of findHiddenGems(inMode))
    if (g.signals.includes("demand-spike"))
      alerts.push({
        id: `demand-${g.product.id}`,
        kind: "demand-increase",
        title: `Demand up ${Math.round(g.changes.demand * 100)}% for ${g.product.name}`,
        detail: `7-day sales vs 30-day average. Sold avg now $${Math.round(g.product.avgSoldPrice)}.`,
        productId: g.product.id,
        createdAt,
      });

  const groups = new Map<string, ProductAnalysis[]>();
  for (const a of analyses) groups.set(a.product.segment, [...(groups.get(a.product.segment) ?? []), a]);

  return {
    products: analyses,
    fastestMovers: [...analyses].sort((a, b) => a.product.avgDaysToSell - b.product.avgDaysToSell || b.sellThrough - a.sellThrough).slice(0, 5),
    bestMargins: [...analyses].sort((a, b) => b.profit.roi - a.profit.roi).slice(0, 5),
    emerging: analyses.filter((a) => gemIds.has(a.product.id) && a.trendDirection === "up").slice(0, 5),
    alerts,
    byGroup: [...groups].map(([group, items]) => ({ group, items })),
  };
}
