'use client';

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function EquipmentTab() {
  // MNH Tracer Commodities Stock Status
  const commoditiesData = [
    { commodity: 'Oxytocin (10 IU/mL)', stock: 450, target: 500, unit: 'vials' },
    { commodity: 'Magnesium Sulfate (50%)', stock: 320, target: 400, unit: 'ampoules' },
    { commodity: 'Misoprostol (200mcg)', stock: 280, target: 300, unit: 'tablets' },
    { commodity: 'Chlorhexidine (4%)', stock: 150, target: 200, unit: 'bottles' },
    { commodity: 'Vitamin K (1mg/0.5mL)', stock: 200, target: 250, unit: 'vials' },
  ];

  // Equipment Status Distribution
  const equipmentStatusData = [
    { name: 'Operational', value: 48, fill: '#10b981' },
    { name: 'Maintenance', value: 5, fill: '#f59e0b' },
    { name: 'Non-Functional', value: 2, fill: '#ef4444' },
  ];

  // Oxygen & Neonatal CPAP Status
  const breathingAidData = [
    { equipment: 'Oxygen Concentrators', operational: 12, maintenance: 1, status: '92%' },
    { equipment: 'Neonatal CPAP Machines', operational: 8, maintenance: 1, status: '89%' },
    { equipment: 'Oxygen Flow Meters', operational: 24, maintenance: 2, status: '92%' },
    { equipment: 'Neonatal Resuscitation Bags', operational: 15, maintenance: 0, status: '100%' },
  ];

  // Blood Transfusion Cold Storage
  const bloodStorageData = [
    { storage: 'Blood Bank Refrigerator #1', capacity: '500 units', current: '380 units', temp: '1-6°C' },
    { storage: 'Blood Bank Refrigerator #2', capacity: '500 units', current: '420 units', temp: '1-6°C' },
    { storage: 'Backup Generator Status', capacity: 'N/A', current: 'Functional', temp: 'N/A' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">Total MNH Equipment</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">55</p>
          <p className="text-xs text-gray-500 mt-1">Units tracked</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">Operational Rate</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">88%</p>
          <p className="text-xs text-gray-500 mt-1">48 of 55 units</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">Zero Stockouts</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">72%</p>
          <p className="text-xs text-gray-500 mt-1">3 of 5 commodities</p>
        </div>
      </div>

      {/* Equipment Status Distribution */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Equipment Status Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={equipmentStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {equipmentStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* MNH Tracer Commodities */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          MNH Tracer Commodities Stock Status
        </h3>
        <div className="space-y-4">
          {commoditiesData.map((item, idx) => {
            const percentage = (item.stock / item.target) * 100;
            const status = percentage >= 100 ? 'emerald' : percentage >= 75 ? 'amber' : 'red';
            return (
              <div key={idx} className="border-b border-slate-100 pb-4 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{item.commodity}</p>
                    <p className="text-sm text-gray-600">{item.stock} / {item.target} {item.unit}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    status === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                    status === 'amber' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      status === 'emerald' ? 'bg-emerald-500' :
                      status === 'amber' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Oxygen & Neonatal CPAP Status */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Oxygen &amp; Neonatal CPAP Equipment Status
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Equipment</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Operational</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Maintenance</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Functional Rate</th>
              </tr>
            </thead>
            <tbody>
              {breathingAidData.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-gray-900">{item.equipment}</td>
                  <td className="py-3 px-4 text-gray-600">{item.operational}</td>
                  <td className="py-3 px-4 text-gray-600">{item.maintenance}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blood Transfusion Cold Storage */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Blood Transfusion Cold Storage Functionality
        </h3>
        <div className="space-y-4">
          {bloodStorageData.map((item, idx) => (
            <div key={idx} className="border-b border-slate-100 pb-4 last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{item.storage}</p>
                  <p className="text-sm text-gray-600">Capacity: {item.capacity}</p>
                  <p className="text-sm text-gray-600">Current: {item.current}</p>
                  <p className="text-sm text-gray-600">Temperature: {item.temp}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  Functional
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
