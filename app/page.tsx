"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Stethoscope,
  TrendingUp,
  CheckSquare,
  ShieldCheck,
  ShieldPlus,
  Grip,
} from "lucide-react";
import { HomeTab } from "@/components/tabs/home-tab";
import { ClinicalTab } from "@/components/tabs/clinical-tab";
import { PrepTab } from "@/components/tabs/prep-tab";
import { MortalityTab } from "@/components/tabs/mortality-tab";
import { AssessmentTab } from "@/components/tabs/assessment-tab";
import { AssessmentDialog } from "@/components/assessment-dialog";
import { GeoFilterBar } from "@/components/geo-filter-bar";
import { GeoFilterProvider } from "@/lib/geo-filter-context";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [showGripMenu, setShowGripMenu] = useState(false);
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);

  const tabs = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "clinical", label: "PMTCT & HIV Care", icon: Stethoscope },
    { id: "prep", label: "PrEP", icon: ShieldPlus },
    { id: "mortality", label: "Mortality & MPDSR", icon: TrendingUp },
    { id: "readiness", label: "Readiness Insights", icon: ShieldCheck },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab />;
      case "clinical":
        return <ClinicalTab />;
      case "prep":
        return <PrepTab />;
      case "mortality":
        return <MortalityTab />;
      case "readiness":
        return <AssessmentTab />;
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
      </div>
    </GeoFilterProvider>
  );
}
