'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  status?: 'good' | 'warning' | 'critical';
  icon?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  unit,
  trend,
  status = 'good',
  icon,
}: MetricCardProps) {
  const statusColors = {
    good: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    critical: 'bg-red-50 border-red-200',
  };

  const statusTextColors = {
    good: 'text-emerald-700',
    warning: 'text-amber-700',
    critical: 'text-red-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-bold ${statusTextColors[status]}`}>
              {value}
            </span>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2 text-sm">
              {trend > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">
                    +{trend.toFixed(1)}% vs last month
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">
                    {trend.toFixed(1)}% vs last month
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        {icon && <div className="ml-4 text-gray-400">{icon}</div>}
      </div>
    </div>
  );
}
