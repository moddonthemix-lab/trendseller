import "server-only";
import { getJson } from "./http";

/** TCGdex: open Pokémon TCG database with TCGplayer (USD) and Cardmarket (EUR) prices. No key. */
const BASE = "https://api.tcgdex.net/v2/en";

interface CardResponse {
  id: string;
  name: string;
  set?: { name: string };
  image?: string;
  pricing?: {
    tcgplayer?: { unit: string; updated: string } & Record<string, { marketPrice?: number; lowPrice?: number; midPrice?: number; highPrice?: number } | string>;
    cardmarket?: { unit: string; updated: string; avg?: number; low?: number; trend?: number; avg1?: number; avg7?: number; avg30?: number };
  };
}

export interface TcgCard {
  source: "tcgdex";
  cardId: string;
  name: string;
  set?: string;
  /** TCGplayer market price (USD) for the main printing, if listed. */
  marketPrice?: number;
  lowPrice?: number;
  highPrice?: number;
  /** Cardmarket (EUR) 1/7/30-day average sale prices — useful as a trend signal. */
  avg1?: number;
  avg7?: number;
  avg30?: number;
  trend?: number;
  updated?: string;
  url: string;
}

export async function tcgdexCard(cardId: string): Promise<TcgCard> {
  const c = await getJson<CardResponse>("TCGdex", `${BASE}/cards/${encodeURIComponent(cardId)}`, { ttlMs: 3_600_000 });
  const tp = c.pricing?.tcgplayer;
  // TCGplayer prices are keyed by printing (normal, holofoil, reverse-holofoil…). Take the priciest.
  const printings = tp
    ? Object.entries(tp)
        .filter(([k, v]) => k !== "unit" && k !== "updated" && typeof v === "object")
        .map(([, v]) => v as { marketPrice?: number; lowPrice?: number; highPrice?: number })
    : [];
  const main = printings.sort((a, b) => (b.marketPrice ?? 0) - (a.marketPrice ?? 0))[0];
  const cm = c.pricing?.cardmarket;
  return {
    source: "tcgdex",
    cardId: c.id,
    name: c.name,
    set: c.set?.name,
    marketPrice: main?.marketPrice,
    lowPrice: main?.lowPrice,
    highPrice: main?.highPrice,
    avg1: cm?.avg1,
    avg7: cm?.avg7,
    avg30: cm?.avg30,
    trend: cm?.trend,
    updated: (tp?.updated as string | undefined) ?? cm?.updated,
    url: `https://www.tcgdex.dev/cards/${c.id}`,
  };
}
