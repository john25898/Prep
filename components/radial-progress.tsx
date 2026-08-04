"use client";

interface RadialProgressProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  color?: string;
  size?: number;
}

/**
 * Circular radial progress ring rendered with SVG.
 * Uses the first data point's value (0–100) as the percentage.
 */
export function RadialProgress({
  data,
  title,
  color = "#10b981",
  size = 170,
}: RadialProgressProps) {
  const value = data && data.length > 0 ? data[0].value : 0;
  const pct = Math.min(Math.max(value, 0), 100);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);
  const textColor =
    pct >= 80
      ? "text-emerald-600"
      : pct >= 60
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="flex flex-col items-center gap-2">
      {title && <p className="text-sm font-medium text-gray-600">{title}</p>}
      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        role="img"
        aria-label={`${pct.toFixed(0)} percent`}
      >
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={14}
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 70 70)"
        />
        <text
          x="70"
          y="70"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-900 font-bold"
          style={{ fontSize: 26 }}
        >
          {pct.toFixed(0)}%
        </text>
      </svg>
      <span className={`text-xs font-semibold ${textColor}`}>
        {pct >= 80
          ? "On Track"
          : pct >= 60
            ? "Partially On Track"
            : "Below Target"}
      </span>
    </div>
  );
}
