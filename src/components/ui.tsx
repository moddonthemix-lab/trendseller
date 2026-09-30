import type { ReactNode } from "react";
import type { TrendDirection } from "@/lib/domain/types";

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function scoreTone(score: number) {
  if (score >= 80) return "bg-accent text-accent-ink";
  if (score >= 60) return "bg-emerald-900/60 text-emerald-200";
  if (score >= 45) return "bg-amber-900/50 text-amber-200";
  return "bg-panel-2 text-muted";
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-7 w-9 text-xs" : "h-9 w-11 text-sm";
  return (
    <span className={`tabular inline-flex shrink-0 items-center justify-center rounded-lg font-bold ${dims} ${scoreTone(score)}`} title="Opportunity score">
      {score}
    </span>
  );
}

export function TrendPill({ direction, change }: { direction: TrendDirection; change?: number }) {
  const map = {
    up: { icon: "▲", cls: "text-accent", label: "Up" },
    down: { icon: "▼", cls: "text-bad", label: "Down" },
    flat: { icon: "▬", cls: "text-muted", label: "Flat" },
  }[direction];
  return (
    <span className={`tabular inline-flex items-center gap-1 text-xs font-semibold ${map.cls}`}>
      {map.icon} {change !== undefined ? pct(change) : map.label}
    </span>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`tabular mt-1 text-xl font-bold ${tone === "good" ? "text-accent" : tone === "bad" ? "text-bad" : ""}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div className="flex items-center gap-2" title={label}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
      <span className="tabular w-8 text-right text-xs text-muted">{Math.round(value)}</span>
    </div>
  );
}

export function Sparkline({ values, width = 120, height = 32, className = "" }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`);
  // Compare first-week vs last-week averages so single noisy days don't flip the colour.
  const k = Math.max(1, Math.min(7, Math.floor(values.length / 3)));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const up = avg(values.slice(-k)) >= avg(values.slice(0, k));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke={up ? "var(--color-accent)" : "var(--color-bad)"} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export const usd = (n: number, digits = 0) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const pct = (n: number, signed = true) => `${signed && n > 0 ? "+" : ""}${Math.round(n * 100)}%`;

export function DecisionBadge({ decision }: { decision: "BUY" | "MAYBE" | "PASS" }) {
  const cls = decision === "BUY" ? "bg-accent text-accent-ink" : decision === "MAYBE" ? "bg-warn text-black" : "bg-bad text-black";
  return <span className={`inline-block rounded-xl px-5 py-2 text-2xl font-black tracking-widest ${cls}`}>{decision}</span>;
}

export function SampleDataBanner({ source }: { source: "sample" | "supabase" }) {
  if (source !== "sample") return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
      Showing built-in sample market data. Connect Supabase and feed <code>/api/ingest</code> to score live data.
    </div>
  );
}
