"use client";

import { useMemo } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { useGeoFilter } from "@/lib/geo-filter-context";
import { useAssessments } from "@/lib/use-assessments";
import {
  facilityOptions,
  geoMatches,
  geoScopeLabel,
  getCountiesForPartner,
  PARTNERS,
  partnerOptionLabel,
} from "@/lib/geo";

const selectClass =
  "w-full px-3 py-2 border border-slate-300 rounded-lg text-gray-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

/**
 * Cascading scope filter: Partner → County → Facility.
 * Selecting a parent resets the children; charts re-render instantly.
 */
export function GeoFilterBar() {
  const { filter, setFilter, resetFilter } = useGeoFilter();
  const assessments = useAssessments();

  const counties = useMemo(
    () => getCountiesForPartner(filter.partner),
    [filter.partner],
  );

  const facilities = useMemo(
    () => facilityOptions(assessments, filter),
    [assessments, filter],
  );

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
              : "All Facilities"}
          </option>
          {facilities.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
              {f.mfl !== "—" ? ` (${f.mfl})` : ""}
            </option>
          ))}
        </select>
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
