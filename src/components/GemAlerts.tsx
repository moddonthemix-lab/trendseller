import { categoryLabel } from "@/lib/domain/types";
import type { SegmentAlert } from "@/lib/scoring/hiddenGems";

export function GemAlerts({ alerts }: { alerts: SegmentAlert[] }) {
  if (!alerts.length) return <p className="text-sm text-muted">No unusual movement this week.</p>;
  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li key={a.segment} className="flex items-center gap-3 rounded-xl bg-panel-2 px-3 py-2.5">
          <span className="tabular w-14 shrink-0 text-center text-lg font-black text-accent">+{Math.round(a.change * 100)}%</span>
          <div className="min-w-0">
            <div className="font-medium">{a.headline}</div>
            <div className="text-xs text-muted">
              {categoryLabel(a.category)} · last {a.period} vs 30-day avg
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
