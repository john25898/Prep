'use client';

interface StatusBadgeProps {
  status: 'green' | 'amber' | 'red';
  label?: string;
  percentage?: number;
}

export function StatusBadge({ status, label, percentage }: StatusBadgeProps) {
  const statusStyles = {
    green: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    amber: 'bg-amber-100 text-amber-700 border-amber-300',
    red: 'bg-red-100 text-red-700 border-red-300',
  };

  const dotStyles = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${statusStyles[status]}`}>
      <div className={`w-2 h-2 rounded-full ${dotStyles[status]}`} />
      {label && <span>{label}</span>}
      {percentage !== undefined && <span>{percentage}%</span>}
    </div>
  );
}
