import { ArbitrageTable } from "@/components/ArbitrageTable";
import { Card, PageHeader, SampleDataBanner } from "@/components/ui";
import { getMarketData } from "@/lib/data/repository";
import { DEAL_RULES, detectDeals } from "@/lib/scoring/deals";
import { dealIdSet, toArbView } from "@/lib/scoring/views";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const { products, localListings, home, source } = await getMarketData();
  const deals = detectDeals(localListings, products, { home });
  const ids = dealIdSet(deals);
  return (
    <>
      <SampleDataBanner source={source} />
      <PageHeader
        title="AI deal detector"
        subtitle={`Alerts when expected ROI > ${DEAL_RULES.minRoi * 100}% OR profit > $${DEAL_RULES.minProfit} OR opportunity score > ${DEAL_RULES.minScore}.`}
      />
      <Card title="How notifications work" className="mb-5">
        <p className="text-sm text-muted">
          A Vercel cron calls <code className="text-ink">/api/cron/deals</code> every morning (edit <code className="text-ink">vercel.json</code> for more frequent runs). New deals are saved
          to your alerts table and POSTed to <code className="text-ink">DEAL_WEBHOOK_URL</code> — use an ntfy.sh topic, Discord or Slack webhook to get push notifications on your phone.
        </p>
      </Card>
      <ArbitrageTable rows={deals.map((d) => toArbView(d, ids))} />
    </>
  );
}
