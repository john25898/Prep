'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeChartProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
}

export function GaugeChart({
  value,
  max = 100,
  label = 'Progress',
  color = '#10b981',
}: GaugeChartProps) {
  const percentage = (value / max) * 100;
  const data = [
    { name: 'filled', value: percentage },
    { name: 'empty', value: 100 - percentage },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill={color} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900">{percentage.toFixed(0)}%</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    </div>
  );
}
