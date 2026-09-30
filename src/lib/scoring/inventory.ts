import type { InventoryItem, Marketplace } from "@/lib/domain/types";
import { mean, round } from "./math";
import { marketplaceFees } from "./profit";

export function itemFees(item: InventoryItem): number {
  if (item.fees !== undefined) return item.fees;
  if (item.salePrice === undefined) return 0;
  return marketplaceFees(item.salePrice, (item.marketplace ?? "ebay") as Marketplace);
}

export function netProfit(item: InventoryItem): number | null {
  if (item.salePrice === undefined) return null;
  return round(item.salePrice - itemFees(item) - (item.shippingCost ?? 0) - item.purchasePrice);
}

export function status(item: InventoryItem): "unlisted" | "listed" | "sold" {
  if (item.saleDate || item.salePrice !== undefined) return "sold";
  if (item.listingDate) return "listed";
  return "unlisted";
}

export interface InventoryMetrics {
  month: string;
  monthlyRevenue: number;
  monthlyProfit: number;
  averageRoi: number;
  sellThroughRate: number;
  unsoldInventoryValue: number;
  unsoldListValue: number;
  itemsSoldThisMonth: number;
  unsoldCount: number;
  avgDaysToSell: number | null;
}

const monthOf = (iso?: string) => iso?.slice(0, 7);
const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

export function inventoryMetrics(items: InventoryItem[], now = new Date()): InventoryMetrics {
  const month = now.toISOString().slice(0, 7);
  const sold = items.filter((i) => status(i) === "sold");
  const soldThisMonth = sold.filter((i) => monthOf(i.saleDate) === month);
  const unsold = items.filter((i) => status(i) !== "sold");
  const rois = sold.filter((i) => i.purchasePrice > 0).map((i) => (netProfit(i) ?? 0) / i.purchasePrice);
  const days = sold.filter((i) => i.saleDate).map((i) => daysBetween(i.listingDate ?? i.purchaseDate, i.saleDate!));
  return {
    month,
    monthlyRevenue: round(soldThisMonth.reduce((s, i) => s + (i.salePrice ?? 0), 0)),
    monthlyProfit: round(soldThisMonth.reduce((s, i) => s + (netProfit(i) ?? 0), 0)),
    averageRoi: round(mean(rois), 4),
    sellThroughRate: items.length ? round(sold.length / items.length, 4) : 0,
    unsoldInventoryValue: round(unsold.reduce((s, i) => s + i.purchasePrice, 0)),
    unsoldListValue: round(unsold.reduce((s, i) => s + (i.listPrice ?? 0), 0)),
    itemsSoldThisMonth: soldThisMonth.length,
    unsoldCount: unsold.length,
    avgDaysToSell: days.length ? round(mean(days), 1) : null,
  };
}
