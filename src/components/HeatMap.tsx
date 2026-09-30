import type { CategoryHeat } from "@/lib/scoring/heatmap";

function cell(value: number, invert = false) {
  const v = invert ? 100 - value : value;
  // 0 → red-ish, 50 → neutral, 100 → green
  const hue = Math.round((v / 100) * 140);
  return { background: `hsl(${hue} 55% ${18 + v * 0.12}%)` };
}

export function HeatMap({ rows }: { rows: CategoryHeat[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="tabular w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="font-medium">Category</th>
            <th className="w-14 text-center font-medium">Demand</th>
            <th className="w-14 text-center font-medium">Profit</th>
            <th className="w-14 text-center font-medium" title="Higher = more crowded">
              Comp.
            </th>
            <th className="w-12 text-center font-medium">Heat</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.category}>
              <td className="pr-1 leading-tight">
                <span className="mr-1.5 text-xs text-muted">{i + 1}.</span>
                {r.label}
              </td>
              <td className="rounded-md text-center" style={cell(r.demand)}>
                {r.demand}
              </td>
              <td className="rounded-md text-center" style={cell(r.profitability)}>
                {r.profitability}
              </td>
              <td className="rounded-md text-center" style={cell(r.competition, true)}>
                {r.competition}
              </td>
              <td className="rounded-md text-center font-bold" style={cell(r.heat)}>
                {r.heat}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
