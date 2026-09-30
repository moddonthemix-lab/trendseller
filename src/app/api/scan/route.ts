import { getMarketData } from "@/lib/data/repository";
import type { Product } from "@/lib/domain/types";
import { matchListing } from "@/lib/scoring/arbitrage";
import { buyVerdict } from "@/lib/scoring/buyScore";
import { marketplaceFees } from "@/lib/scoring/profit";

export const dynamic = "force-dynamic";

/**
 * Thrift-store lookup. `code` = UPC/EAN/ISBN from the barcode scanner, `q` = free text,
 * `id` = catalog id (e.g. from photo identification), `price` = shelf price.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.replace(/\D/g, "");
  const q = url.searchParams.get("q")?.trim();
  const id = url.searchParams.get("id");
  const price = Math.max(0, Number(url.searchParams.get("price") ?? "0") || 0);
  const { products } = await getMarketData();

  let matches: Product[] = [];
  if (id) matches = products.filter((p) => p.id === id);
  if (!matches.length && code) {
    // UPC-A vs EAN-13 differ by a leading zero.
    const norm = (s: string) => s.replace(/^0+/, "");
    matches = products.filter((p) => p.upc && norm(p.upc) === norm(code));
  }
  if (!matches.length && q) {
    const exact = matchListing(q, products);
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    const fuzzy = products
      .map((p) => ({ p, hits: words.filter((w) => `${p.name} ${p.brand} ${p.keywords.join(" ")}`.toLowerCase().includes(w)).length }))
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .map((x) => x.p);
    matches = [...new Set([...(exact ? [exact] : []), ...fuzzy])].slice(0, 5);
  }

  return Response.json({
    matches: matches.map((p) => {
      const v = buyVerdict(p, price || p.typicalSourcePrice);
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        upc: p.upc,
        avgSoldPrice: p.avgSoldPrice,
        sellThrough: v.analysis.sellThrough,
        avgDaysToSell: p.avgDaysToSell,
        estimatedFees: marketplaceFees(p.avgSoldPrice, "ebay"),
        shippingEstimate: p.avgShippingCost,
        purchasePrice: v.analysis.profit.purchasePrice,
        profit: v.analysis.profit.netProfit,
        roi: v.analysis.profit.roi,
        opportunityScore: v.analysis.opportunityScore,
        buyScore: v.buyScore,
        decision: v.decision,
        rationale: v.rationale,
      };
    }),
  });
}
