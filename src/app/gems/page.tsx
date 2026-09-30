import Link from "next/link";
import { GemAlerts } from "@/components/GemAlerts";
import { Card, PageHeader, SampleDataBanner, ScoreBadge, pct, usd } from "@/components/ui";
import { getMarketData } from "@/lib/data/repository";
import { findHiddenGems, segmentAlerts } from "@/lib/scoring/hiddenGems";
import { analyzeProduct } from "@/lib/scoring/opportunity";

export const dynamic = "force-dynamic";

export default async function GemsPage() {
  const { products, source } = await getMarketData();
  const gems = findHiddenGems(products);
  return (
    <>
      <SampleDataBanner source={source} />
      <PageHeader title="Hidden gem finder" subtitle="Current 7-day metrics vs the 30-day average — demand spikes, price spikes, shrinking supply, faster sell-through, rising search." />
      <Card title="Segment alerts" className="mb-5">
        <GemAlerts alerts={segmentAlerts(products)} />
      </Card>
      <Card title={`Products with unusual movement (${gems.length})`}>
        <div className="overflow-x-auto">
          <table className="tabular w-full min-w-[640px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="text-right">
                <th className="py-2 text-left font-medium">Product</th>
                <th className="font-medium">Price</th>
                <th className="font-medium">Demand</th>
                <th className="font-medium">Supply</th>
                <th className="font-medium">STR</th>
                <th className="font-medium">Search</th>
                <th className="font-medium">Avg sold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {gems.map((g) => {
                const a = analyzeProduct(g.product);
                const c = (v: number, invert = false) => <td className={(invert ? v < -0.1 : v > 0.1) ? "text-accent" : "text-muted"}>{pct(v)}</td>;
                return (
                  <tr key={g.product.id} className="text-right">
                    <td className="py-2 text-left">
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={a.opportunityScore} size="sm" />
                        <div>
                          <Link href={`/products/${g.product.id}`} className="font-medium hover:underline">
                            {g.product.name}
                          </Link>
                          <div className="text-xs text-muted">{g.signals.map((s) => s.replace(/-/g, " ")).join(" · ")}</div>
                        </div>
                      </div>
                    </td>
                    {c(g.changes.price)}
                    {c(g.changes.demand)}
                    {c(g.changes.supply, true)}
                    {c(g.changes.sellThrough)}
                    {c(g.changes.search)}
                    <td>{usd(g.product.avgSoldPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
