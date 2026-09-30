import Link from "next/link";
import type { ProductAnalysis } from "@/lib/scoring/opportunity";
import { ScoreBadge, Sparkline, TrendPill, pct, usd } from "./ui";

export function OpportunityList({ items }: { items: ProductAnalysis[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((a) => (
        <li key={a.product.id}>
          <Link href={`/products/${a.product.id}`} className="flex items-center gap-3 py-3 hover:bg-panel-2/40">
            <ScoreBadge score={a.opportunityScore} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{a.product.name}</div>
              <div className="tabular mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                <span>Sold avg {usd(a.product.avgSoldPrice)}</span>
                <span>Active avg {usd(a.product.avgActivePrice)}</span>
                <span>STR {pct(a.sellThrough, false)}</span>
                <span className="text-accent">Profit ~{usd(a.profit.netProfit)}</span>
              </div>
            </div>
            <div className="hidden flex-col items-end gap-1 sm:flex">
              <Sparkline values={a.product.history.slice(-30).map((d) => d.avgSoldPrice)} width={90} height={26} />
              <TrendPill direction={a.trendDirection} change={a.trend.change30d} />
            </div>
            <div className="sm:hidden">
              <TrendPill direction={a.trendDirection} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
