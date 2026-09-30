"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ScoreBadge, pct, usd } from "./ui";

export interface ArbView {
  id: string;
  title: string;
  source: string;
  city: string;
  url?: string;
  postedAt: string;
  price: number;
  productId: string;
  productName: string;
  marketValue: number;
  discount: number;
  profit: number;
  roi: number;
  distance: number | null;
  score: number;
  isDeal: boolean;
}

const ago = (iso: string) => {
  const h = Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

export function ArbitrageTable({ rows }: { rows: ArbView[] }) {
  const [maxDist, setMaxDist] = useState(40);
  const [minProfit, setMinProfit] = useState(20);
  const view = useMemo(() => rows.filter((r) => (r.distance === null || r.distance <= maxDist) && r.profit >= minProfit), [rows, maxDist, minProfit]);
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl border border-line bg-panel p-3 text-sm">
        <label>
          <span className="text-muted">Within {maxDist} mi</span>
          <input type="range" min={5} max={100} step={5} value={maxDist} onChange={(e) => setMaxDist(Number(e.target.value))} className="w-full accent-emerald-400" />
        </label>
        <label>
          <span className="text-muted">Min profit {usd(minProfit)}</span>
          <input type="range" min={0} max={300} step={10} value={minProfit} onChange={(e) => setMinProfit(Number(e.target.value))} className="w-full accent-emerald-400" />
        </label>
      </div>
      <ul className="space-y-2">
        {view.map((r) => (
          <li key={r.id} className="rounded-xl border border-line bg-panel p-3">
            <div className="flex items-start gap-3">
              <ScoreBadge score={r.score} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {r.title}
                      </a>
                    ) : (
                      r.title
                    )}
                    {r.isDeal && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-ink">DEAL</span>}
                  </span>
                  <span className="tabular font-bold text-accent">+{usd(r.profit)}</span>
                </div>
                <div className="tabular mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                  <span className="text-ink">Listed {usd(r.price)}</span>
                  <span>Market {usd(r.marketValue)}</span>
                  <span>{pct(r.discount, false)} under</span>
                  <span>ROI {pct(r.roi, false)}</span>
                  <span>
                    {r.source} · {r.city}
                    {r.distance !== null && ` · ${r.distance.toFixed(1)} mi`}
                  </span>
                  <span>{ago(r.postedAt)}</span>
                </div>
                <Link href={`/products/${r.productId}`} className="mt-1 inline-block text-xs text-accent">
                  Matched: {r.productName} →
                </Link>
              </div>
            </div>
          </li>
        ))}
        {!view.length && <li className="text-sm text-muted">Nothing matches these filters.</li>}
      </ul>
    </div>
  );
}
