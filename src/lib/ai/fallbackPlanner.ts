import type { LocalListing, Product } from "@/lib/domain/types";
import { CATEGORIES } from "@/lib/domain/types";
import type { GeoPoint } from "@/lib/scoring/arbitrage";
import { findArbitrage } from "@/lib/scoring/arbitrage";
import { maxBuyForRoi } from "@/lib/scoring/brief";
import { marketHeatMap } from "@/lib/scoring/heatmap";
import { segmentAlerts } from "@/lib/scoring/hiddenGems";
import { rankOpportunities } from "@/lib/scoring/opportunity";

const VENUE_WORDS: [RegExp, string[]][] = [
  [/goodwill|thrift|salvation|savers/i, ["Goodwill", "Thrift store"]],
  [/flea/i, ["Flea market"]],
  [/estate/i, ["Estate sale"]],
  [/garage|yard/i, ["Garage sale"]],
  [/pawn/i, ["Pawn shop"]],
];

/** Deterministic planner used when no Claude API key is configured. */
export function fallbackPlan(message: string, products: Product[], listings: LocalListing[], home?: GeoPoint): string {
  const budget = Number(message.match(/\$\s?(\d[\d,]*)/)?.[1]?.replace(/,/g, "")) || undefined;
  const venues = VENUE_WORDS.find(([re]) => re.test(message))?.[1];
  const category = CATEGORIES.find((c) => message.toLowerCase().includes(c.label.toLowerCase().split(" ")[0]))?.id;
  const out: string[] = [];

  if (/hot|categor/i.test(message) && !venues) {
    out.push("**Hottest categories right now**");
    for (const h of marketHeatMap(products).slice(0, 5)) out.push(`- **${h.label}** — heat ${h.heat} (demand ${h.demand}, profit ${h.profitability}, competition ${h.competition})`);
    out.push("", "**What's moving this week**");
    for (const s of segmentAlerts(products).slice(0, 5)) out.push(`- ${s.headline}`);
    return out.join("\n");
  }

  let picks = rankOpportunities(products).filter((a) => a.trendDirection !== "down");
  if (venues) picks = picks.filter((a) => a.product.bestSources.some((s) => venues.includes(s)));
  if (category) picks = picks.filter((a) => a.product.category === category);

  out.push(venues ? `**Hunt list for ${venues[0].toLowerCase()} trips**` : "**Top sourcing targets this week**");
  let spent = 0;
  for (const a of picks.slice(0, 10)) {
    const p = a.product;
    const cap = maxBuyForRoi(p);
    if (budget && spent + p.typicalSourcePrice > budget) continue;
    spent += p.typicalSourcePrice;
    out.push(
      `- **${p.name}** (${p.brand}) — sells ~$${Math.round(p.avgSoldPrice)} in ~${Math.round(p.avgDaysToSell)} days; expect to find it around $${p.typicalSourcePrice}, pay up to $${cap}. Est. profit $${Math.round(a.profit.netProfit)}. ${a.reasons[0] ?? ""}`,
    );
  }
  if (budget) out.push("", `Buying one of each at typical prices uses about $${spent} of your $${budget}; keep the rest for surprise finds scoring BUY in the scanner.`);

  const deals = findArbitrage(listings, products, { home, maxDistance: 30, minProfit: 30 }).slice(0, 3);
  if (deals.length) {
    out.push("", "**Also worth a detour (local listings)**");
    for (const d of deals) out.push(`- ${d.listing.title} — $${d.listing.price} in ${d.listing.city}, est. profit $${Math.round(d.profit.netProfit)}`);
  }
  out.push("", "_Rule-based plan. Add an ANTHROPIC_API_KEY for full AI answers._");
  return out.join("\n");
}
