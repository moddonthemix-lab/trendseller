import { ProductTable, type ProductRowView } from "@/components/ProductTable";
import { PageHeader, SampleDataBanner } from "@/components/ui";
import { getMarketData } from "@/lib/data/repository";
import { rankOpportunities } from "@/lib/scoring/opportunity";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { products, source } = await getMarketData();
  const rows: ProductRowView[] = rankOpportunities(products).map((a) => ({
    id: a.product.id,
    name: a.product.name,
    brand: a.product.brand,
    category: a.product.category,
    avgSold: a.product.avgSoldPrice,
    high: a.product.highSoldPrice,
    low: a.product.lowSoldPrice,
    active: a.product.activeListings,
    sold: a.product.soldListings,
    str: a.sellThrough,
    shipping: a.product.avgShippingCost,
    trend: a.trend.change30d,
    direction: a.trendDirection,
    profit: a.profit.netProfit,
    score: a.opportunityScore,
  }));
  return (
    <>
      <SampleDataBanner source={source} />
      <PageHeader title="Product intelligence" subtitle="Every tracked product with sold/active pricing, sell-through, trend and opportunity score." />
      <ProductTable rows={rows} />
    </>
  );
}
