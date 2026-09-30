import Link from "next/link";
import { GemAlerts } from "@/components/GemAlerts";
import { HeatMap } from "@/components/HeatMap";
import { OpportunityList } from "@/components/OpportunityList";
import { Card, PageHeader, SampleDataBanner, ScoreBadge, Stat, usd } from "@/components/ui";
import { getMarketData } from "@/lib/data/repository";
import { morningBrief } from "@/lib/scoring/brief";
import { detectDeals } from "@/lib/scoring/deals";
import { marketHeatMap } from "@/lib/scoring/heatmap";
import { findHiddenGems, segmentAlerts } from "@/lib/scoring/hiddenGems";
import { rankOpportunities } from "@/lib/scoring/opportunity";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { products, localListings, source, home } = await getMarketData();
  const ranked = rankOpportunities(products);
  const brief = morningBrief(products, localListings, home);
  const alerts = segmentAlerts(products).slice(0, 6);
  const heat = marketHeatMap(products);
  const deals = detectDeals(localListings, products, { home, maxDistance: 40 });
  const gems = findHiddenGems(products);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <SampleDataBanner source={source} />
      <PageHeader title="Today's sourcing plan" subtitle={today}>
        <Link href="/assistant" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
          Ask the sourcing AI →
        </Link>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Top opportunity" value={ranked[0]?.opportunityScore ?? "–"} hint={ranked[0]?.product.name} />
        <Stat label="Local deals" value={deals.length} hint="ROI > 100% · profit > $50 · score > 90" tone="good" />
        <Stat label="Hidden gems" value={gems.length} hint="7-day spikes vs 30-day avg" />
        <Stat label="Hottest category" value={heat[0]?.label ?? "–"} hint={`Heat ${heat[0]?.heat ?? 0}`} />
      </div>

      <Card title="Buy this today" className="mb-5">
        <ol className="space-y-3">
          {brief.map((b, i) => (
            <li key={b.productId + i} className="rounded-xl bg-panel-2 p-3">
              <div className="flex items-start gap-3">
                <ScoreBadge score={b.score} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <Link href={`/products/${b.productId}`} className="font-semibold hover:underline">
                      {b.what}
                    </Link>
                    <span className="tabular text-sm font-bold text-accent">+{usd(b.expectedProfit)}</span>
                  </div>
                  <div className="mt-1 grid gap-x-4 gap-y-0.5 text-xs text-muted sm:grid-cols-3">
                    <span>
                      <b className="text-ink">Where:</b> {b.where}
                    </span>
                    <span className="tabular">
                      <b className="text-ink">{b.kind === "local-deal" ? "Price:" : "Pay up to:"}</b> {usd(b.maxBuyPrice)}
                    </span>
                    <span className="tabular">
                      <b className="text-ink">Sells in:</b> ~{b.daysToSell} days
                    </span>
                  </div>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted">
                    {b.why.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Today's best opportunities" action={<Link href="/products" className="text-xs text-accent">All products →</Link>} className="lg:col-span-3">
          <OpportunityList items={ranked.slice(0, 10)} />
        </Card>
        <div className="space-y-5 lg:col-span-2">
          <Card title="Hidden gem alerts" action={<Link href="/gems" className="text-xs text-accent">Details →</Link>}>
            <GemAlerts alerts={alerts} />
          </Card>
          <Card title="Market heat map">
            <HeatMap rows={heat} />
          </Card>
        </div>
      </div>
    </>
  );
}
