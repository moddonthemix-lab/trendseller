import "server-only";
import { getJson } from "./http";

/** Scryfall: Magic: The Gathering card data with daily TCGplayer/Cardmarket prices. No key. */
interface ScryfallCard {
  id: string;
  name: string;
  set_name: string;
  prices: { usd: string | null; usd_foil: string | null; eur: string | null };
  scryfall_uri: string;
}

export interface MtgCard {
  source: "scryfall";
  cardId: string;
  name: string;
  set: string;
  usd?: number;
  usdFoil?: number;
  eur?: number;
  url: string;
}

const num = (s: string | null) => (s ? Number(s) : undefined);

export async function scryfallCard(id: string): Promise<MtgCard> {
  // Scryfall asks for 50–100 ms between requests; the cache keeps us well under that.
  const c = await getJson<ScryfallCard>("Scryfall", `https://api.scryfall.com/cards/${encodeURIComponent(id)}`, { ttlMs: 6 * 3_600_000 });
  return { source: "scryfall", cardId: c.id, name: c.name, set: c.set_name, usd: num(c.prices.usd), usdFoil: num(c.prices.usd_foil), eur: num(c.prices.eur), url: c.scryfall_uri };
}
