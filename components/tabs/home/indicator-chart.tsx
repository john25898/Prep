"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Landmark } from "lucide-react";
import { ViewDataButton } from "@/components/view-data";
import { COUNTY_COLORS } from "./shared";

type IndicatorCountyRow = {
  label: string;
  full: string;
  target: number;
  values: {
    county: string;
    value: number;
    live?: boolean;
    entered?: boolean;
    notReported?: boolean;
  }[];
};

/** Grouped bar chart: indicators on the X axis, one bar per county. */
export function PartnerIndicatorChart({
  title,
  subtitle,
  rows,
  counties,
}: {
  title: string;
  subtitle: string;
  rows: IndicatorCountyRow[];
  counties: string[];
}) {
  const data = rows.map((r) => {
    const obj: Record<string, number | string> = { label: r.label };
    for (const v of r.values) obj[v.county] = v.value;
    return obj;
  });
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
            <Landmark className="w-4 h-4 text-slate-500" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {counties.map((c, i) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{
                    backgroundColor: COUNTY_COLORS[i % COUNTY_COLORS.length],
                  }}
                />
                {c}
              </span>
            ))}
          </div>
          <ViewDataButton
            title={title}
            data={data}
            note="% per county — rows match the bars above"
            detail={{
              formula:
                "each indicator shown as % per county — target line from the VTP / readiness target set",
              inputs: rows.flatMap((r) =>
                r.values.map((v) => ({
                  label: `${r.full} · ${v.county}`,
                  value: v.notReported ? 0 : v.value,
                  source: v.live ? ("live" as const) : ("n/r" as const),
                })),
              ),
              notes: [
                "Colored bars are real KHIS values for the selected month (● badge); blank bars (n/r) are indicators not reported on KHIS for these counties this period — nothing is shown rather than a fake baseline.",
              ],
            }}
          />
        </div>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 8, left: 0, bottom: 4 }}
            barCategoryGap="18%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              width={34}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              formatter={(v, name, item) => {
                const r = rows.find(
                  (row) => row.label === item?.payload?.label,
                );
                const entry = r?.values.find((x) => x.county === String(name));
                if (entry?.notReported) {
                  return ["Not reported on KHIS this period", String(name)];
                }
                return [
                  `${Number(v).toFixed(1)}%${
                    entry?.entered ? " ★ Entry" : entry?.live ? " ● KHIS" : ""
                  }`,
                  String(name),
                ];
              }}
              labelFormatter={(label) => {
                const r = rows.find((row) => row.label === label);
                return r
                  ? r.values.every((x) => x.notReported)
                    ? `${r.full} · no monthly KHIS data`
                    : `${r.full} · target ≥ ${r.target}%`
                  : String(label);
              }}
            />
            {counties.map((c, i) => (
              <Bar
                key={c}
                dataKey={c}
                name={c}
                fill={COUNTY_COLORS[i % COUNTY_COLORS.length]}
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
