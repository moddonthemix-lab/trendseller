import { ArbitrageTable } from "@/components/ArbitrageTable";
import { PageHeader, SampleDataBanner } from "@/components/ui";
import { getMarketData } from "@/lib/data/repository";
import { findArbitrage } from "@/lib/scoring/arbitrage";
import { detectDeals } from "@/lib/scoring/deals";
import { dealIdSet, toArbView } from "@/lib/scoring/views";

export const dynamic = "force-dynamic";

export default async function ArbitragePage() {
  const { products, localListings, home, source } = await getMarketData();
  const opps = findArbitrage(localListings, products, { home });
  const deals = dealIdSet(detectDeals(localListings, products, { home }));
  return (
    <>
      <SampleDataBanner source={source} />
      <PageHeader title="Local arbitrage finder" subtitle="Local listings matched to sold-market value: market value − asking price, after fees and shipping." />
      <ArbitrageTable rows={opps.map((o) => toArbView(o, deals))} />
    </>
  );
}
