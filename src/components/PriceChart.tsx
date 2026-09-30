import type { DailyMetric } from "@/lib/domain/types";

/** 90-day sold price line with sold-volume bars underneath. */
export function PriceChart({ history }: { history: DailyMetric[] }) {
  const W = 640;
  const H = 200;
  const barH = 40;
  const padL = 40;
  const plotW = W - padL - 6;
  const priceH = H - barH - 24;
  if (history.length < 2) return <p className="text-sm text-muted">Not enough history yet.</p>;
  const prices = history.map((d) => d.avgSoldPrice);
  const min = Math.min(...prices) * 0.95;
  const max = Math.max(...prices) * 1.05;
  const maxSold = Math.max(...history.map((d) => d.soldCount), 1);
  const x = (i: number) => padL + (i / (history.length - 1)) * plotW;
  const y = (v: number) => 8 + (1 - (v - min) / (max - min)) * priceH;
  const line = history.map((d, i) => `${x(i).toFixed(1)},${y(d.avgSoldPrice).toFixed(1)}`).join(" ");
  const ticks = [min, (min + max) / 2, max];
  const bw = Math.max(1, plotW / history.length - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Sold price and volume over 90 days">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - 6} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray="3 4" />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--color-muted)">
            ${Math.round(t)}
          </text>
        </g>
      ))}
      {history.map((d, i) => {
        const h = (d.soldCount / maxSold) * barH;
        return <rect key={d.date} x={x(i) - bw / 2} y={H - 16 - h} width={bw} height={h} fill="var(--color-info)" opacity={i >= history.length - 7 ? 0.9 : 0.35} />;
      })}
      <polyline points={line} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />
      <text x={padL} y={H - 2} fontSize="10" fill="var(--color-muted)">
        {history[0].date}
      </text>
      <text x={W - 6} y={H - 2} fontSize="10" textAnchor="end" fill="var(--color-muted)">
        {history[history.length - 1].date}
      </text>
    </svg>
  );
}
