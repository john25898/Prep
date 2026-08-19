import { CalendarX2 } from "lucide-react";

/**
 * Honest empty state for a selected period that has no KHIS data.
 * Used whenever KHIS answered the request but reported zero values for the
 * scope/period — e.g. a future month, or a past month with no reporting.
 * NEVER shows fabricated demo numbers in this state.
 */
export function NoDataState({
  peLabel,
  future = false,
  scope,
  title,
}: {
  peLabel: string;
  /** True when the selected period is in the future (before today). */
  future?: boolean;
  /** KHIS scope string shown in the live badge (e.g. "jamii-tekelezi (201 facilities)"). */
  scope?: string;
  title?: string;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
      <CalendarX2 className="mx-auto h-9 w-9 text-amber-500" />
      <h4 className="mt-3 font-semibold text-amber-900 text-lg">
        {title ??
          (future
            ? `No KHIS data yet for ${peLabel}`
            : `No KHIS data for ${peLabel}`)}
      </h4>
      <p className="mt-1.5 text-sm text-amber-700 max-w-2xl mx-auto">
        {future
          ? "The selected period is in the future — KHIS cannot have reported data for it yet. Pick a month or date range up to the current period to see live numbers."
          : `KHIS reported no values for ${peLabel} in this scope${
              scope ? ` (${scope})` : ""
            }. This usually means facilities hadn't reported yet — select a
            period with reported data to see live numbers.`}
      </p>
    </div>
  );
}
