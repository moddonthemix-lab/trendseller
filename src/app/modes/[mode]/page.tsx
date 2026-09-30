import Link from "next/link";
import { notFound } from "next/navigation";
import { OpportunityList } from "@/components/OpportunityList";
import { Card, PageHeader, SampleDataBanner, pct, usd } from "@/components/ui";
import { getMarketData } from "@/lib/data/repository";
import { MODE_CONFIG, isMode, modeReport } from "@/lib/scoring/modes";
import type { ProductAnalysis } from "@/lib/scoring/opportunity";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return Object.keys(MODE_CONFIG).map((mode) => ({ mode }));
}

const ALERT_ICON = { "below-market": "💲", "rare-model": "💎", "demand-increase": "📈", deal: "🔥", "hidden-gem": "✨" } as const;

function MiniList({ items, metric }: { items: ProductAnalysis[]; metric: (a: ProductAnalysis) => string }) {
  if (!items.length) return <p className="text-sm text-muted">Nothing yet.</p>;
  return (
    <ol className="space-y-1.5 text-sm">
      {items.map((a) => (
        <li key={a.product.id} className="flex justify-between gap-3">
          <Link href={`/products/${a.product.id}`} className="truncate hover:underline">
            {a.product.name}
          </Link>
          <span className="tabular shrink-0 text-accent">{metric(a)}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function ModePage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!isMode(mode)) notFound();
  const cfg = MODE_CONFIG[mode];
  const { products, localListings, home, source } = await getMarketData();
  const r = modeReport(mode, products, localListings, home);

  return (
    <>
      <SampleDataBanner source={source} />
      <PageHeader title={cfg.title} subtitle={cfg.blurb} />
      <div className="mb-5 flex flex-wrap gap-1.5">
        {cfg.tracks.map((t) => (
          <span key={t} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
            {t}
          </span>
        ))}
      </div>

      <div className="mb-5 grid gap-5 md:grid-cols-3">
        <Card title="Fastest movers">
          <MiniList items={r.fastestMovers} metric={(a) => `${Math.round(a.product.avgDaysToSell)}d · ${pct(a.sellThrough, false)} STR`} />
        </Card>
        <Card title="Best margins">
          <MiniList items={r.bestMargins} metric={(a) => `${pct(a.profit.roi, false)} · ${usd(a.profit.netProfit)}`} />
        </Card>
        <Card title="Emerging trends">
          <MiniList items={r.emerging} metric={(a) => pct(a.trend.change7d)} />
        </Card>
      </div>

      <Card title={`Alerts (${r.alerts.length})`} className="mb-5">
        {r.alerts.length ? (
          <ul className="space-y-2">
            {r.alerts.map((a) => (
              <li key={a.id} className="flex gap-3 rounded-xl bg-panel-2 px-3 py-2 text-sm">
                <span>{ALERT_ICON[a.kind]}</span>
                <div>
                  <div className="font-medium">{a.productId ? <Link href={`/products/${a.productId}`} className="hover:underline">{a.title}</Link> : a.title}</div>
                  <div className="text-xs text-muted">{a.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No below-market listings, rare models or demand spikes right now.</p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {r.byGroup.map((g) => (
          <Card key={g.group} title={g.group}>
            <OpportunityList items={g.items} />
          </Card>
        ))}
      </div>
    </>
  );
}
