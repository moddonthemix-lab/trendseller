"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/lib/domain/types";
import { ScoreBadge, TrendPill, pct, usd } from "./ui";

export interface ProductRowView {
  id: string;
  name: string;
  brand: string;
  category: CategoryId;
  avgSold: number;
  high: number;
  low: number;
  active: number;
  sold: number;
  str: number;
  shipping: number;
  trend: number;
  direction: "up" | "down" | "flat";
  profit: number;
  score: number;
}

type SortKey = "score" | "avgSold" | "str" | "profit" | "trend" | "active";

export function ProductTable({ rows }: { rows: ProductRowView[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [sort, setSort] = useState<SortKey>("score");
  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (cat === "all" || r.category === cat) && (!needle || `${r.name} ${r.brand}`.toLowerCase().includes(needle)))
      .sort((a, b) => b[sort] - a[sort]);
  }, [rows, q, cat, sort]);

  const th = (key: SortKey, label: string) => (
    <th className="px-2 py-2 text-right font-medium">
      <button onClick={() => setSort(key)} className={sort === key ? "text-accent" : "hover:text-ink"}>
        {label}
        {sort === key ? " ↓" : ""}
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or brands" className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm" />
        <select value={cat} onChange={(e) => setCat(e.target.value as CategoryId | "all")} className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="tabular w-full min-w-[760px] text-sm">
          <thead className="bg-panel-2 text-xs text-muted">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Score</th>
              <th className="px-2 py-2 text-left font-medium">Product</th>
              {th("avgSold", "Avg sold")}
              <th className="px-2 py-2 text-right font-medium">Low–High</th>
              {th("active", "Active")}
              <th className="px-2 py-2 text-right font-medium">Sold 30d</th>
              {th("str", "STR")}
              <th className="px-2 py-2 text-right font-medium">Ship</th>
              {th("trend", "Trend 30d")}
              {th("profit", "Est. profit")}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {view.map((r) => (
              <tr key={r.id} className="hover:bg-panel-2/50">
                <td className="px-2 py-2">
                  <ScoreBadge score={r.score} size="sm" />
                </td>
                <td className="px-2 py-2">
                  <Link href={`/products/${r.id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-muted">{r.brand}</div>
                </td>
                <td className="px-2 py-2 text-right">{usd(r.avgSold)}</td>
                <td className="px-2 py-2 text-right text-muted">
                  {usd(r.low)}–{usd(r.high)}
                </td>
                <td className="px-2 py-2 text-right">{r.active}</td>
                <td className="px-2 py-2 text-right">{r.sold}</td>
                <td className="px-2 py-2 text-right">{pct(r.str, false)}</td>
                <td className="px-2 py-2 text-right text-muted">{usd(r.shipping)}</td>
                <td className="px-2 py-2 text-right">
                  <TrendPill direction={r.direction} change={r.trend} />
                </td>
                <td className="px-2 py-2 text-right font-semibold text-accent">{usd(r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{view.length} products · profit assumes typical sourcing price and eBay fees</p>
    </div>
  );
}
