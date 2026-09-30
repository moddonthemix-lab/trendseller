"use client";
import { useState } from "react";
import type { Marketplace } from "@/lib/domain/types";
import { FEE_SCHEDULES, calculateProfit } from "@/lib/scoring/profit";
import { pct, usd } from "./ui";

export function ProfitCalculator(props: { salePrice: number; shipping: number; purchasePrice: number }) {
  const [sale, setSale] = useState(Math.round(props.salePrice));
  const [cost, setCost] = useState(props.purchasePrice);
  const [ship, setShip] = useState(props.shipping);
  const [mkt, setMkt] = useState<Marketplace>("ebay");
  const r = calculateProfit({ salePrice: sale, purchasePrice: cost, shippingCost: ship, marketplace: mkt });
  const num = (v: number, set: (n: number) => void, label: string) => (
    <label className="text-xs text-muted">
      {label}
      <input type="number" inputMode="decimal" value={v} onChange={(e) => set(Number(e.target.value) || 0)} className="tabular mt-1 w-full rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm text-ink" />
    </label>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {num(sale, setSale, "Sale price")}
        {num(cost, setCost, "Your cost")}
        {num(ship, setShip, "Shipping")}
        <label className="text-xs text-muted">
          Marketplace
          <select value={mkt} onChange={(e) => setMkt(e.target.value as Marketplace)} className="mt-1 w-full rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm text-ink">
            {Object.entries(FEE_SCHEDULES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="tabular grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-panel-2 p-2">
          <div className="text-xs text-muted">Fees</div>
          {usd(r.fees, 2)}
        </div>
        <div className="rounded-lg bg-panel-2 p-2">
          <div className="text-xs text-muted">Net profit</div>
          <span className={r.netProfit >= 0 ? "font-bold text-accent" : "font-bold text-bad"}>{usd(r.netProfit, 2)}</span>
        </div>
        <div className="rounded-lg bg-panel-2 p-2">
          <div className="text-xs text-muted">ROI</div>
          {pct(r.roi, false)}
        </div>
      </div>
    </div>
  );
}
