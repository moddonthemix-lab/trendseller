"use client";
import type { InventoryItem } from "@/lib/domain/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Inventory persistence: Supabase when signed in, otherwise this browser's localStorage. */
export interface InventoryStore {
  kind: "supabase" | "local";
  list(): Promise<InventoryItem[]>;
  upsert(item: InventoryItem): Promise<InventoryItem>;
  remove(id: string): Promise<void>;
}

const KEY = "reseller-edge.inventory.v1";

function readLocal(): InventoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as InventoryItem[];
  } catch {
    return [];
  }
}

function writeLocal(items: InventoryItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full or blocked — nothing else to do client-side
  }
}

const localStore: InventoryStore = {
  kind: "local",
  async list() {
    return readLocal();
  },
  async upsert(item) {
    const items = readLocal();
    const i = items.findIndex((x) => x.id === item.id);
    if (i >= 0) items[i] = item;
    else items.unshift(item);
    writeLocal(items);
    return item;
  },
  async remove(id) {
    writeLocal(readLocal().filter((x) => x.id !== id));
  },
};

type Row = Record<string, unknown>;
const toRow = (i: InventoryItem): Row => ({
  id: i.id,
  name: i.name,
  category: i.category,
  product_id: i.productId ?? null,
  purchase_date: i.purchaseDate,
  purchase_price: i.purchasePrice,
  source_location: i.sourceLocation,
  listing_date: i.listingDate ?? null,
  list_price: i.listPrice ?? null,
  sale_date: i.saleDate ?? null,
  sale_price: i.salePrice ?? null,
  shipping_cost: i.shippingCost ?? null,
  fees: i.fees ?? null,
  marketplace: i.marketplace ?? null,
  notes: i.notes ?? null,
});
const opt = <T,>(v: unknown, f: (x: unknown) => T) => (v === null || v === undefined ? undefined : f(v));
const fromRow = (r: Row): InventoryItem => ({
  id: String(r.id),
  name: String(r.name),
  category: r.category as InventoryItem["category"],
  productId: opt(r.product_id, String),
  purchaseDate: String(r.purchase_date),
  purchasePrice: Number(r.purchase_price),
  sourceLocation: String(r.source_location ?? ""),
  listingDate: opt(r.listing_date, String),
  listPrice: opt(r.list_price, Number),
  saleDate: opt(r.sale_date, String),
  salePrice: opt(r.sale_price, Number),
  shippingCost: opt(r.shipping_cost, Number),
  fees: opt(r.fees, Number),
  marketplace: opt(r.marketplace, String) as InventoryItem["marketplace"],
  notes: opt(r.notes, String),
});

export async function getInventoryStore(): Promise<InventoryStore> {
  const db = getSupabaseBrowserClient();
  if (!db) return localStore;
  const { data } = await db.auth.getUser();
  if (!data.user) return localStore;
  return {
    kind: "supabase",
    async list() {
      const { data, error } = await db.from("inventory_items").select("*").order("purchase_date", { ascending: false });
      if (error) throw error;
      return (data as Row[]).map(fromRow);
    },
    async upsert(item) {
      const { data, error } = await db.from("inventory_items").upsert(toRow(item)).select().single();
      if (error) throw error;
      return fromRow(data as Row);
    },
    async remove(id) {
      const { error } = await db.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
  };
}
