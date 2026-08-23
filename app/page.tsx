"use client";

import { useRef, useState } from "react";
import {
  LayoutDashboard,
  Layers,
  HeartHandshake,
  ShieldPlus,
  CheckSquare,
  Grip,
  Wand2,
  Trash2,
} from "lucide-react";
import type { ChartInsight } from "@/components/ai-assistant";
import { HomeTab } from "@/components/tabs/home-tab";
import { DomainsTab } from "@/components/tabs/domains-tab";
import { ShaTab } from "@/components/tabs/sha-tab";
import { PrepTab } from "@/components/tabs/prep-tab";
import { AssessmentDialog } from "@/components/assessment-dialog";
import { GeoFilterBar } from "@/components/geo-filter-bar";
import { GeoFilterProvider } from "@/lib/geo-filter-context";

function PlaygroundTab({
  charts,
  onRemove,
}: {
  charts: ChartInsight[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              Saved visuals
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Playground vault
            </h2>
          </div>
          <div className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-sm font-semibold text-sky-700">
            {charts.length} saved chart{charts.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {charts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          No visuals saved yet. Use the chart “Save” action inside any dashboard
          chart to keep a snapshot here.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Saved chart
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-800">
                    {chart.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(chart.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:border-rose-200 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>

              {chart.image ? (
                <img
                  src={chart.image}
                  alt={chart.title}
                  className="mt-3 w-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <p className="mt-3 text-sm text-slate-600">{chart.summary}</p>
              )}

              {chart.prompt && (
                <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-slate-700">
                  {chart.prompt}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [savedCharts, setSavedCharts] = useState<ChartInsight[]>([]);
  const [showGripMenu, setShowGripMenu] = useState(false);
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  const addChartToPlayground = (chart: ChartInsight) => {
    const already = savedCharts.some((item) => item.id === chart.id);
    setSavedCharts((current) => {
      if (current.some((item) => item.id === chart.id)) return current;
      return [chart, ...current].slice(0, 12);
    });
    showToast(already ? "Already in playground" : "Saved to playground ✓");
  };

  const removeChartFromPlayground = (id: string) => {
    setSavedCharts((current) => current.filter((item) => item.id !== id));
  };

  const tabs = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "domains", label: "Domains", icon: Layers },
    { id: "sha", label: "SHA", icon: HeartHandshake },
    { id: "prep", label: "PrEP", icon: ShieldPlus },
    { id: "playground", label: "Playground", icon: Wand2 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab onSaveToPlayground={addChartToPlayground} />;
      case "domains":
        return <DomainsTab onSaveToPlayground={addChartToPlayground} />;
      case "sha":
        return <ShaTab onSaveToPlayground={addChartToPlayground} />;
      case "prep":
        return <PrepTab onSaveToPlayground={addChartToPlayground} />;
      case "playground":
        return (
          <PlaygroundTab
            charts={savedCharts}
            onRemove={removeChartFromPlayground}
          />
        );
      default:
        return null;
    }
  };

  return (
    <GeoFilterProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                EWENE MNH Health Platform
              </h1>
              <p className="text-gray-600 mt-1">
                Facility Performance &amp; Compliance Dashboard — Data for
                Assessment
              </p>
            </div>

            {/* Grip Menu - App Launcher */}
            <div className="relative">
              <button
                onClick={() => setShowGripMenu(!showGripMenu)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="App Launcher"
              >
                <Grip className="w-6 h-6 text-gray-600" />
              </button>

              {showGripMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 p-4 z-50">
                  <button
                    onClick={() => {
                      setShowAssessmentDialog(true);
                      setShowGripMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 rounded-lg transition-colors font-medium text-gray-900 border-2 border-emerald-500"
                  >
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                    Facility Assessment Entry
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cascading scope filter: Partner → County → Sub-County → Facility */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-5">
            <GeoFilterBar />
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      isActive
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Assessment Dialog Modal */}
        {showAssessmentDialog && (
          <AssessmentDialog onClose={() => setShowAssessmentDialog(false)} />
        )}

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
        </main>

        {/* Save confirmation toast */}
        {toast && (
          <div className="fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </GeoFilterProvider>
  );
}
