"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarRange, Filter, RotateCcw } from "lucide-react";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { useAssessments } from "@/lib/use-assessments";
import {
  facilityOptions,
  geoMatches,
  geoScopeLabel,
  getCountiesForPartner,
  PARTNERS,
  partnerOptionLabel,
  type PeriodMode,
} from "@/lib/geo";
import {
  hasFacilityRoster,
  partnerFacilities,
  partnerSubCounties,
} from "@/lib/partners";

const selectClass =
  "w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

/**
 * Cascading scope filter: Partner → County → Facility.
 * Selecting a parent resets the children; charts re-render instantly.
 */
export function GeoFilterBar() {
  const { filter, setFilter, resetFilter, pe, peLabel, periodFuture } =
    useGeoFilter();
  const assessments = useAssessments();

  // KHIS can only have data for past/current months — cap the pickers at
  // today so the native calendar UI can't offer future dates.
  const today = new Date();
  const maxMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const maxDate = today.toISOString().slice(0, 10);

  const counties = useMemo(
    () => getCountiesForPartner(filter.partner),
    [filter.partner],
  );

  const subCounties = useMemo(() => {
    if (hasFacilityRoster(filter.partner) && filter.county) {
      return partnerSubCounties(filter.partner, filter.county);
    }
    return [];
  }, [filter.partner, filter.county]);

  const facilities = useMemo(() => {
    // Partners with a facility roster (Excel) list their REAL facilities;
    // partners without one fall back to facilities from entered assessments.
    if (hasFacilityRoster(filter.partner)) {
      const seen = new Set<string>();
      return partnerFacilities(
        filter.partner,
        filter.county || undefined,
        filter.subCounty || undefined,
      )
        .filter((f) => {
          const key = f.name.trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((f) => ({
          name: f.name,
          mfl: "—",
          county: f.county,
          subCounty: f.subCounty,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return facilityOptions(assessments, filter);
  }, [assessments, filter]);

  const inScope = useMemo(
    () => assessments.filter((a) => geoMatches(a, filter)).length,
    [assessments, filter],
  );

  const scopeLabel = useMemo(() => geoScopeLabel(filter), [filter]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2 pr-2 pb-2">
        <Filter className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-semibold text-gray-700">Scope</span>
      </div>

      <div className="w-44">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Partner
        </label>
        <select
          className={selectClass}
          value={filter.partner}
          onChange={(e) =>
            setFilter({
              partner: e.target.value,
              county: "",
              subCounty: "",
              facility: "",
            })
          }
        >
          {PARTNERS.map((p) => (
            <option key={p.id} value={p.id}>
              {partnerOptionLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div className="w-40">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          County
        </label>
        <select
          className={selectClass}
          value={filter.county}
          onChange={(e) =>
            setFilter({
              county: e.target.value,
              subCounty: "",
              facility: "",
            })
          }
        >
          <option value="">All Counties</option>
          {counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="w-44">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Sub-County
        </label>
        <select
          className={selectClass}
          value={filter.subCounty}
          onChange={(e) =>
            setFilter({
              subCounty: e.target.value,
              facility: "",
            })
          }
          disabled={subCounties.length === 0}
        >
          <option value="">
            {subCounties.length === 0 ? "All Sub-Counties" : "All Sub-Counties"}
          </option>
          {subCounties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="w-56">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Facility
        </label>
        <select
          className={selectClass}
          value={filter.facility}
          onChange={(e) => setFilter({ facility: e.target.value })}
          disabled={facilities.length === 0}
        >
          <option value="">
            {facilities.length === 0
              ? "No facilities in scope"
              : `All Facilities (${facilities.length})`}
          </option>
          {facilities.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
              {f.mfl !== "—" ? ` (${f.mfl})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ------------------------------------------------------------------
        Period — single reporting month OR a multi-month range (e.g. quarter).
        Month mode -> pe = "202505". Range mode -> pe = "202508;202509" (one
        row per month; totals are summed across the whole range).
      ------------------------------------------------------------------ */}
      <div className="flex items-end gap-2 rounded-lg border border-slate-200 p-2 bg-white">
        <div className="flex items-center gap-1.5 pr-1 pb-2">
          <CalendarRange className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-700">Period</span>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Mode
          </label>
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            {(["month", "range"] as PeriodMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFilter({ periodMode: m })}
                className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                  filter.periodMode === m
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-600 hover:bg-slate-50"
                }`}
              >
                {m === "month" ? "Month" : "Range"}
              </button>
            ))}
          </div>
        </div>
        {filter.periodMode === "month" ? (
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Month
            </label>
            <input
              type="month"
              max={maxMonth}
              className={selectClass}
              value={filter.periodMonth}
              onChange={(e) =>
                setFilter({ periodMonth: e.target.value || "2025-05" })
              }
            />
          </div>
        ) : (
          <>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                From
              </label>
              <input
                type="date"
                max={maxDate}
                className={`${selectClass} w-36`}
                value={filter.periodStart}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  // Keep the range valid: never let start pass end.
                  const end =
                    filter.periodEnd && v > filter.periodEnd
                      ? v
                      : filter.periodEnd;
                  setFilter({ periodStart: v, periodEnd: end });
                }}
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                To
              </label>
              <input
                type="date"
                max={maxDate}
                className={`${selectClass} w-36`}
                value={filter.periodEnd}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  // Keep the range valid: never let end precede start.
                  const start =
                    filter.periodStart && v < filter.periodStart
                      ? v
                      : filter.periodStart;
                  setFilter({ periodStart: start, periodEnd: v });
                }}
              />
            </div>
          </>
        )}
        <div className="pb-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Resolved
          </label>
          <span
            className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold whitespace-nowrap"
            title={`pe = ${pe}`}
          >
            {peLabel}
          </span>
          {periodFuture && (
            <span
              className="mt-1 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold"
              title="This period is in the future — KHIS has no data for it yet."
            >
              <AlertTriangle className="w-3 h-3" />
              Future period — no data yet
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto pb-2">
        <p className="text-xs text-gray-500 text-right">
          <span className="font-semibold text-gray-700">{scopeLabel}</span>
          <br />
          {inScope} of {assessments.length} assessments in scope
        </p>
        <button
          onClick={resetFilter}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}
