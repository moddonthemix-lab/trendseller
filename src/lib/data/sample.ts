import type { LocalListing, Product } from "@/lib/domain/types";
import { CATALOG } from "./catalog";
import { productFromSpec } from "./generate";
import { DEFAULT_HOME, sampleLocalListings } from "./localListings";

/** Midnight UTC today, so sample data is stable throughout a day. */
export function todayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function sampleProducts(now = new Date()): Product[] {
  const today = todayUtc(now);
  return CATALOG.map((spec, i) => productFromSpec(spec, i, today));
}

export function sampleMarket(now = new Date(), home = DEFAULT_HOME): { products: Product[]; localListings: LocalListing[] } {
  return { products: sampleProducts(now), localListings: sampleLocalListings(now, home) };
}
