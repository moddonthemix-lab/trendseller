import "server-only";
import type { Product } from "@/lib/domain/types";
import { discogsRelease, type DiscogsRelease } from "./discogs";
import { settle } from "./http";
import { scryfallCard, type MtgCard } from "./scryfall";
import { tcgdexCard, type TcgCard } from "./tcgdex";

export type LiveQuote = DiscogsRelease | TcgCard | MtgCard;

export interface LiveMarketData {
  quotes: LiveQuote[];
  errors: string[];
}

export const hasLiveSources = (p: Product) => Boolean(p.refs?.discogsReleaseId || p.refs?.tcgdexCardId || p.refs?.scryfallId);

/** Fetch today's numbers for a product from every free source it's linked to. */
export async function liveMarketData(p: Product): Promise<LiveMarketData> {
  const jobs: Promise<{ value: LiveQuote | null; error?: string }>[] = [];
  if (p.refs?.discogsReleaseId) jobs.push(settle(() => discogsRelease(p.refs!.discogsReleaseId!)));
  if (p.refs?.tcgdexCardId) jobs.push(settle(() => tcgdexCard(p.refs!.tcgdexCardId!)));
  if (p.refs?.scryfallId) jobs.push(settle(() => scryfallCard(p.refs!.scryfallId!)));
  const results = await Promise.all(jobs);
  return {
    quotes: results.flatMap((r) => (r.value ? [r.value] : [])),
    errors: results.flatMap((r) => (r.error ? [r.error] : [])),
  };
}

/** Flat numbers stored per day by the collector (external_snapshots.data). */
export function quoteToSnapshot(q: LiveQuote): Record<string, number | string | undefined> {
  switch (q.source) {
    case "discogs":
      return { numForSale: q.numForSale, lowestPrice: q.lowestPrice, have: q.have, want: q.want, demandRatio: q.demandRatio };
    case "tcgdex":
      return { marketPrice: q.marketPrice, lowPrice: q.lowPrice, highPrice: q.highPrice, avg1: q.avg1, avg7: q.avg7, avg30: q.avg30, trend: q.trend };
    case "scryfall":
      return { usd: q.usd, usdFoil: q.usdFoil, eur: q.eur };
  }
}
