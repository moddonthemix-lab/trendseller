import type { Product } from "@/lib/domain/types";
import { liveMarketData, type LiveQuote } from "@/lib/sources/live";
import { Card, pct, usd } from "./ui";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

const money = (n?: number, unit = "$") => (n === undefined ? "–" : unit === "$" ? usd(n, 2) : `€${n.toFixed(2)}`);

function Quote({ q }: { q: LiveQuote }) {
  switch (q.source) {
    case "discogs":
      return (
        <dl className="space-y-1.5 text-sm">
          <Row label="Lowest listed" value={money(q.lowestPrice)} />
          <Row label="For sale on Discogs" value={q.numForSale} />
          <Row label="Collectors want / have" value={`${q.want.toLocaleString()} / ${q.have.toLocaleString()}`} />
          <Row label="Demand ratio" value={<span className={q.demandRatio >= 1 ? "text-accent" : ""}>{q.demandRatio.toFixed(2)}</span>} />
          <p className="pt-1 text-xs text-muted">
            <a href={q.url} target="_blank" rel="noreferrer" className="text-accent">
              Discogs
            </a>{" "}
            · asking prices, not sold prices
          </p>
        </dl>
      );
    case "tcgdex": {
      const trend = q.avg7 && q.avg30 ? q.avg7 / q.avg30 - 1 : undefined;
      return (
        <dl className="space-y-1.5 text-sm">
          <Row label="TCGplayer market" value={money(q.marketPrice)} />
          <Row label="TCGplayer low – high" value={`${money(q.lowPrice)} – ${money(q.highPrice)}`} />
          <Row label="Cardmarket avg 7d / 30d" value={`${money(q.avg7, "€")} / ${money(q.avg30, "€")}`} />
          {trend !== undefined && <Row label="7d vs 30d" value={<span className={trend >= 0 ? "text-accent" : "text-bad"}>{pct(trend)}</span>} />}
          <p className="pt-1 text-xs text-muted">
            <a href={q.url} target="_blank" rel="noreferrer" className="text-accent">
              TCGdex
            </a>
            {q.updated && ` · updated ${q.updated.slice(0, 10)}`}
          </p>
        </dl>
      );
    }
    case "scryfall":
      return (
        <dl className="space-y-1.5 text-sm">
          <Row label="TCGplayer (USD)" value={money(q.usd)} />
          <Row label="Foil (USD)" value={money(q.usdFoil)} />
          <Row label="Cardmarket (EUR)" value={money(q.eur, "€")} />
          <p className="pt-1 text-xs text-muted">
            <a href={q.url} target="_blank" rel="noreferrer" className="text-accent">
              Scryfall
            </a>{" "}
            · {q.set}
          </p>
        </dl>
      );
  }
}

/** Server component: today's numbers from the free sources this product is linked to. */
export async function LiveMarketPanel({ product }: { product: Product }) {
  const { quotes, errors } = await liveMarketData(product);
  return (
    <Card title="Live market data">
      {quotes.map((q) => (
        <Quote key={q.source} q={q} />
      ))}
      {!quotes.length && <p className="text-sm text-muted">Live sources didn&apos;t respond right now.</p>}
      {errors.length > 0 && <p className="mt-2 text-xs text-amber-300">{errors.join("; ")}</p>}
    </Card>
  );
}
