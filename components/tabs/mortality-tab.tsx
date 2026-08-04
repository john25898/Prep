'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function MortalityTab() {
  // Reported vs Audited Deaths data
  const deathComparisonData = [
    { month: 'Jan', reported: 18, audited: 15 },
    { month: 'Feb', reported: 17, audited: 15 },
    { month: 'Mar', reported: 16, audited: 14 },
    { month: 'Apr', reported: 17, audited: 15 },
    { month: 'May', reported: 16, audited: 14 },
    { month: 'Jun', reported: 16, audited: 14 },
  ];

  // Maternal vs Neonatal Deaths
  const maternalNeonatalData = [
    { type: 'Maternal Deaths', reported: 42, audited: 37 },
    { type: 'Neonatal Deaths', reported: 58, audited: 50 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">Total Reported Deaths (YTD)</p>
          <p className="text-3xl font-bold text-red-600 mt-2">100</p>
          <p className="text-xs text-gray-500 mt-1">Maternal + Neonatal</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">Total Audited Deaths (YTD)</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">87</p>
          <p className="text-xs text-gray-500 mt-1">After verification</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">MPDSR Coverage</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">87%</p>
          <p className="text-xs text-gray-500 mt-1">Deaths audited</p>
        </div>
      </div>

      {/* Reported vs Audited Deaths Over Time */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Reported vs Audited Maternal &amp; Neonatal Deaths (Monthly Trend)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={deathComparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="reported" stroke="#ef4444" strokeWidth={2} name="Reported Deaths" />
            <Line type="monotone" dataKey="audited" stroke="#f59e0b" strokeWidth={2} name="Audited Deaths" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Maternal vs Neonatal Deaths Breakdown */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Maternal vs Neonatal Deaths Comparison
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={maternalNeonatalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="reported" fill="#ef4444" name="Reported" />
            <Bar dataKey="audited" fill="#10b981" name="Audited" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Death Verification Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Maternal Deaths Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Reported Cases</span>
              <span className="font-bold text-red-600">42</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Audited Cases</span>
              <span className="font-bold text-amber-600">37</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Verification Rate</span>
              <span className="font-bold text-emerald-600">88%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Average Audit Time</span>
              <span className="font-bold text-gray-900">18 days</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Neonatal Deaths Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Reported Cases</span>
              <span className="font-bold text-red-600">58</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Audited Cases</span>
              <span className="font-bold text-amber-600">50</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700">Verification Rate</span>
              <span className="font-bold text-emerald-600">86%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Average Audit Time</span>
              <span className="font-bold text-gray-900">21 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
