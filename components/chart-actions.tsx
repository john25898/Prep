"use client";

import { Save, Sparkles } from "lucide-react";
import { captureChartImage } from "@/lib/capture-chart";
import type { ChartInsight } from "@/components/ai-assistant";

/**
 * Per-chart action buttons shared across every tab: "AI Assist" (opens the
 * AI copilot pre-loaded with this chart's context) and "Save" (captures the
 * chart visual and adds it to the Playground). Rendered next to the
 * View Data button on every chart card so all three actions are consistent
 * dashboard-wide.
 */
export function ChartActions({
  chart,
  onAskAi,
  onSaveToPlayground,
}: {
  chart: ChartInsight;
  onAskAi?: (chart: ChartInsight) => void;
  onSaveToPlayground?: (chart: ChartInsight) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onAskAi?.(chart)}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
        title="Ask the AI assistant about this chart"
      >
        <Sparkles className="h-3.5 w-3.5" /> AI Assist
      </button>
      <button
        type="button"
        onClick={async (e) => {
          if (!onSaveToPlayground) return;
          const image = await captureChartImage(e.currentTarget);
          onSaveToPlayground({ ...chart, image });
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-200 hover:text-sky-700"
        title="Add this chart to the playground"
      >
        <Save className="h-3.5 w-3.5" /> Save
      </button>
    </>
  );
}
