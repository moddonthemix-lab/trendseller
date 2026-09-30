"use client";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, type InventoryItem, type Marketplace } from "@/lib/domain/types";
import { getInventoryStore, type InventoryStore } from "@/lib/inventory/store";
import { inventoryMetrics, itemFees, netProfit, status } from "@/lib/scoring/inventory";
import { FEE_SCHEDULES } from "@/lib/scoring/profit";
import { Card, Stat, pct, usd } from "./ui";

const today = () => new Date().toISOString().slice(0, 10);

const blank = (): InventoryItem => ({
  id: crypto.randomUUID(),
  name: "",
  category: "electronics",
  purchaseDate: today(),
  purchasePrice: 0,
  sourceLocation: "",
});

function ItemForm({ initial, onSave, onCancel }: { initial: InventoryItem; onSave: (i: InventoryItem) => void; onCancel: () => void }) {
  const [f, setF] = useState(initial);
  const set = <K extends keyof InventoryItem>(k: K, v: InventoryItem[K]) => setF((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v === "" ? undefined : Number(v));
  const cls = "mt-1 w-full rounded-lg border border-line bg-panel-2 px-2 py-2 text-sm text-ink";
  const field = (label: string, el: React.ReactNode) => (
    <label className="text-xs text-muted">
      {label}
      {el}
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (f.name.trim()) onSave(f);
      }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      <div className="col-span-2">{field("Item", <input required className={cls} value={f.name} onChange={(e) => set("name", e.target.value)} />)}</div>
      {field(
        "Category",
        <select className={cls} value={f.category} onChange={(e) => set("category", e.target.value as InventoryItem["category"])}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>,
      )}
      {field("Location sourced", <input className={cls} value={f.sourceLocation} onChange={(e) => set("sourceLocation", e.target.value)} placeholder="Goodwill Burbank" />)}
      {field("Purchase date", <input type="date" className={cls} value={f.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />)}
      {field("Purchase price", <input type="number" step="0.01" className={cls} value={f.purchasePrice} onChange={(e) => set("purchasePrice", Number(e.target.value))} />)}
      {field("Listing date", <input type="date" className={cls} value={f.listingDate ?? ""} onChange={(e) => set("listingDate", e.target.value || undefined)} />)}
      {field("List price", <input type="number" step="0.01" className={cls} value={f.listPrice ?? ""} onChange={(e) => set("listPrice", num(e.target.value))} />)}
      {field("Sale date", <input type="date" className={cls} value={f.saleDate ?? ""} onChange={(e) => set("saleDate", e.target.value || undefined)} />)}
      {field("Sale price", <input type="number" step="0.01" className={cls} value={f.salePrice ?? ""} onChange={(e) => set("salePrice", num(e.target.value))} />)}
      {field("Shipping cost", <input type="number" step="0.01" className={cls} value={f.shippingCost ?? ""} onChange={(e) => set("shippingCost", num(e.target.value))} />)}
      {field(
        "Marketplace",
        <select className={cls} value={f.marketplace ?? "ebay"} onChange={(e) => set("marketplace", e.target.value as Marketplace)}>
          {Object.entries(FEE_SCHEDULES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>,
      )}
      {field("Fees (blank = auto)", <input type="number" step="0.01" className={cls} value={f.fees ?? ""} onChange={(e) => set("fees", num(e.target.value))} />)}
      <div className="col-span-2 flex items-end gap-2 sm:col-span-3">
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Save</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function Inventory() {
  const [store, setStore] = useState<InventoryStore | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [filter, setFilter] = useState<"all" | "unlisted" | "listed" | "sold">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInventoryStore()
      .then(async (s) => {
        setStore(s);
        setItems(await s.list());
      })
      .catch(() => setError("Couldn't load inventory."));
  }, []);

  const m = useMemo(() => inventoryMetrics(items), [items]);
  const view = items.filter((i) => filter === "all" || status(i) === filter);

  async function save(item: InventoryItem) {
    if (!store) return;
    try {
      const saved = await store.upsert(item);
      setItems((xs) => {
        const i = xs.findIndex((x) => x.id === item.id);
        return i >= 0 ? xs.map((x) => (x.id === item.id ? saved : x)) : [saved, ...xs];
      });
      setEditing(null);
    } catch {
      setError("Save failed.");
    }
  }

  async function remove(id: string) {
    if (!store || !confirm("Delete this item?")) return;
    await store.remove(id).catch(() => setError("Delete failed."));
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label={`Revenue (${m.month})`} value={usd(m.monthlyRevenue)} hint={`${m.itemsSoldThisMonth} sold`} />
        <Stat label="Profit this month" value={usd(m.monthlyProfit)} tone={m.monthlyProfit >= 0 ? "good" : "bad"} />
        <Stat label="Average ROI" value={pct(m.averageRoi, false)} hint="sold items" />
        <Stat label="Sell-through" value={pct(m.sellThroughRate, false)} hint={m.avgDaysToSell !== null ? `~${m.avgDaysToSell} days to sell` : undefined} />
        <Stat label="Unsold inventory" value={usd(m.unsoldInventoryValue)} hint={`${m.unsoldCount} items · list ${usd(m.unsoldListValue)}`} />
      </div>

      {error && <p className="rounded-xl bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>}

      <Card
        title="Items"
        action={
          <div className="flex items-center gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="rounded-lg border border-line bg-panel-2 px-2 py-1 text-xs">
              <option value="all">All</option>
              <option value="unlisted">Unlisted</option>
              <option value="listed">Listed</option>
              <option value="sold">Sold</option>
            </select>
            <button onClick={() => setEditing(blank())} className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-accent-ink">
              + Add item
            </button>
          </div>
        }
      >
        {editing && (
          <div className="mb-4 rounded-xl border border-line bg-panel-2/50 p-3">
            <ItemForm key={editing.id} initial={editing} onSave={save} onCancel={() => setEditing(null)} />
          </div>
        )}
        {store && <p className="mb-2 text-xs text-muted">{store.kind === "supabase" ? "Synced to Supabase." : "Saved in this browser. Sign in to sync across devices."}</p>}
        <div className="overflow-x-auto">
          <table className="tabular w-full min-w-[720px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="text-right">
                <th className="py-2 text-left font-medium">Item</th>
                <th className="font-medium">Bought</th>
                <th className="font-medium">Cost</th>
                <th className="font-medium">Status</th>
                <th className="font-medium">Sale</th>
                <th className="font-medium">Fees</th>
                <th className="font-medium">Ship</th>
                <th className="font-medium">Net</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {view.map((i) => {
                const st = status(i);
                const np = netProfit(i);
                return (
                  <tr key={i.id} className="text-right">
                    <td className="py-2 text-left">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted">{i.sourceLocation}</div>
                    </td>
                    <td className="text-muted">{i.purchaseDate}</td>
                    <td>{usd(i.purchasePrice, 2)}</td>
                    <td>
                      <span className={`rounded px-1.5 py-0.5 text-xs ${st === "sold" ? "bg-emerald-950 text-emerald-300" : st === "listed" ? "bg-sky-950 text-sky-300" : "bg-panel-2 text-muted"}`}>{st}</span>
                    </td>
                    <td>{i.salePrice !== undefined ? usd(i.salePrice, 2) : i.listPrice !== undefined ? <span className="text-muted">{usd(i.listPrice)} list</span> : "–"}</td>
                    <td className="text-muted">{i.salePrice !== undefined ? usd(itemFees(i), 2) : "–"}</td>
                    <td className="text-muted">{i.shippingCost !== undefined ? usd(i.shippingCost, 2) : "–"}</td>
                    <td className={np === null ? "text-muted" : np >= 0 ? "font-semibold text-accent" : "font-semibold text-bad"}>{np === null ? "–" : usd(np, 2)}</td>
                    <td className="whitespace-nowrap pl-2">
                      <button onClick={() => setEditing(i)} className="text-xs text-accent">
                        Edit
                      </button>
                      <button onClick={() => remove(i.id)} className="ml-2 text-xs text-muted hover:text-bad">
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!view.length && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-sm text-muted">
                    No items yet. Add your first find.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
