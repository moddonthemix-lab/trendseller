import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LiveMarketPanel } from "@/components/LiveMarketPanel";
import { PriceChart } from "@/components/PriceChart";
import { ProfitCalculator } from "@/components/ProfitCalculator";
import { Card, Meter, PageHeader, ScoreBadge, Stat, TrendPill, pct, usd } from "@/components/ui";
import { categoryLabel } from "@/lib/domain/types";
import { getMarketData } from "@/lib/data/repository";
import { maxBuyForRoi } from "@/lib/scoring/brief";
import { detectGem } from "@/lib/scoring/hiddenGems";
import { hasLiveSources } from "@/lib/sources/live";
import { OPPORTUNITY_WEIGHTS, analyzeProduct, type FactorKey } from "@/lib/scoring/opportunity";

export const dynamic = "force-dynamic";

const FACTOR_LABEL: Record<FactorKey, string> = {
  sellThrough: "Sell-through rate",
  profitMargin: "Profit margin (ROI)",
  trendGrowth: "Trend growth",
  competition: "Competition (low = good)",
  daysToSell: "Days to sell",
};

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { products } = await getMarketData();
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  const a = analyzeProduct(product);
  const gem = detectGem(product);

  return (
    <>
      <Link href="/products" className="mb-3 inline-block text-xs text-muted hover:text-ink">
        ← Product intelligence
      </Link>
      <PageHeader title={product.name} subtitle={`${product.brand} · ${categoryLabel(product.category)} · ${product.segment}`}>
        <ScoreBadge score={a.opportunityScore} size="lg" />
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Avg sold (30d)" value={usd(product.avgSoldPrice)} hint={`${usd(product.lowSoldPrice)} – ${usd(product.highSoldPrice)}`} />
        <Stat label="Avg active price" value={usd(product.avgActivePrice)} hint={`${product.activeListings} active · ${product.sellerCount} sellers`} />
        <Stat label="Sell-through" value={pct(a.sellThrough, false)} hint={`${product.soldListings} sold / 30d`} />
        <Stat label="Est. profit" value={usd(a.profit.netProfit)} hint={`at ${usd(product.typicalSourcePrice)} cost · ${pct(a.profit.roi, false)} ROI`} tone="good" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card title="90-day sold price & volume" action={<TrendPill direction={a.trendDirection} change={a.trend.blended} />}>
            <PriceChart history={product.history} />
            <div className="tabular mt-2 flex gap-4 text-xs text-muted">
              <span>7d {pct(a.trend.change7d)}</span>
              <span>30d {pct(a.trend.change30d)}</span>
              <span>90d {pct(a.trend.change90d)}</span>
            </div>
          </Card>
          <Card title="Why it scores this way">
            <div className="space-y-2">
              {(Object.keys(OPPORTUNITY_WEIGHTS) as FactorKey[]).map((k) => (
                <div key={k} className="grid grid-cols-[1fr_2fr] items-center gap-3 text-sm">
                  <span>
                    {FACTOR_LABEL[k]} <span className="text-xs text-muted">({OPPORTUNITY_WEIGHTS[k] * 100}%)</span>
                  </span>
                  <Meter value={a.factors[k]} />
                </div>
              ))}
            </div>
            {a.reasons.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
                {a.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-5 lg:col-span-2">
          {hasLiveSources(product) && (
            <Suspense fallback={<Card title="Live market data"><p className="text-sm text-muted">Loading live prices…</p></Card>}>
              <LiveMarketPanel product={product} />
            </Suspense>
          )}
          <Card title="Sourcing">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Pay no more than</dt>
                <dd className="tabular font-semibold">{usd(maxBuyForRoi(product))} (100% ROI)</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Typical find price</dt>
                <dd className="tabular">{usd(product.typicalSourcePrice)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Best places to look</dt>
                <dd className="text-right">{product.bestSources.join(", ")}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Avg days to sell</dt>
                <dd className="tabular">{product.avgDaysToSell}</dd>
              </div>
              {product.upc && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">UPC</dt>
                  <dd className="tabular">{product.upc}</dd>
                </div>
              )}
            </dl>
          </Card>
          {gem && (
            <Card title="Hidden gem signals">
              <div className="flex flex-wrap gap-1.5">
                {gem.signals.map((s) => (
                  <span key={s} className="rounded-full bg-emerald-950 px-2.5 py-1 text-xs text-emerald-300">
                    {s.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
              <div className="tabular mt-3 grid grid-cols-2 gap-1 text-xs text-muted">
                <span>Price {pct(gem.changes.price)}</span>
                <span>Demand {pct(gem.changes.demand)}</span>
                <span>Supply {pct(gem.changes.supply)}</span>
                <span>Sell-through {pct(gem.changes.sellThrough)}</span>
                <span>Search {pct(gem.changes.search)}</span>
              </div>
            </Card>
          )}
          <Card title="Profit calculator">
            <ProfitCalculator salePrice={product.avgSoldPrice} shipping={product.avgShippingCost} purchasePrice={product.typicalSourcePrice} />
          </Card>
        </div>
      </div>
    </>
  );
}
