import type { Marketplace } from "@/lib/domain/types";
import { round } from "./math";

/**
 * Seller fee schedules (approximate, 2026). Tweak here if a platform changes pricing.
 * percent applies to the total the buyer pays (item + shipping) on eBay/Mercari.
 */
export const FEE_SCHEDULES: Record<Marketplace, { label: string; percent: number; fixed: number; appliesToShipping: boolean }> = {
  ebay: { label: "eBay", percent: 0.1325, fixed: 0.4, appliesToShipping: true },
  mercari: { label: "Mercari", percent: 0.1, fixed: 0.5, appliesToShipping: true },
  poshmark: { label: "Poshmark", percent: 0.2, fixed: 0, appliesToShipping: false },
  reverb: { label: "Reverb", percent: 0.0819, fixed: 0.49, appliesToShipping: true },
  facebook: { label: "Facebook (local)", percent: 0, fixed: 0, appliesToShipping: false },
};

export function marketplaceFees(salePrice: number, marketplace: Marketplace = "ebay", shippingCharged = 0): number {
  const s = FEE_SCHEDULES[marketplace];
  if (marketplace === "poshmark" && salePrice < 15) return 2.95;
  const base = s.appliesToShipping ? salePrice + shippingCharged : salePrice;
  return round(base * s.percent + (salePrice > 0 ? s.fixed : 0));
}

export interface ProfitInput {
  salePrice: number;
  purchasePrice: number;
  shippingCost: number;
  marketplace?: Marketplace;
  /** When true the buyer pays shipping on top of salePrice (fees then apply to it too). */
  buyerPaysShipping?: boolean;
}

export interface ProfitBreakdown {
  salePrice: number;
  fees: number;
  shipping: number;
  purchasePrice: number;
  netProfit: number;
  /** netProfit / purchasePrice; Infinity-safe (free items report 10 = 1000%). */
  roi: number;
  /** netProfit / salePrice */
  margin: number;
}

export function calculateProfit(input: ProfitInput): ProfitBreakdown {
  const marketplace = input.marketplace ?? "ebay";
  const shippingCharged = input.buyerPaysShipping ? input.shippingCost : 0;
  const fees = marketplaceFees(input.salePrice, marketplace, shippingCharged);
  const shipping = marketplace === "facebook" ? 0 : input.shippingCost;
  const revenue = input.salePrice + shippingCharged;
  const netProfit = round(revenue - fees - shipping - input.purchasePrice);
  const roi = input.purchasePrice > 0 ? netProfit / input.purchasePrice : netProfit > 0 ? 10 : 0;
  const margin = input.salePrice > 0 ? netProfit / input.salePrice : 0;
  return {
    salePrice: input.salePrice,
    fees,
    shipping,
    purchasePrice: input.purchasePrice,
    netProfit,
    roi: round(roi, 4),
    margin: round(margin, 4),
  };
}

/** Rough shipping estimate from weight when the product has no observed average. */
export function estimateShipping(weightLbs: number): number {
  if (weightLbs <= 0.5) return 5.5;
  if (weightLbs <= 1) return 8;
  if (weightLbs <= 3) return 12.5;
  if (weightLbs <= 5) return 16;
  if (weightLbs <= 10) return 24;
  if (weightLbs <= 20) return 38;
  return 60;
}
