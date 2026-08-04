'use client';

import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ClinicalTab() {
  const [activeSubtab, setActiveSubtab] = useState('2.a');

  const subtabs = [
    { id: '2.a', label: '2.A: Intake & Screening' },
    { id: '2.b', label: '2.B: Diagnosis, Treatment & Follow-up' },
  ];

  return (
    <div>
      <div className="flex gap-4 mb-6 border-b border-slate-200 pb-0 overflow-x-auto">
        {subtabs.map((subtab) => (
          <button
            key={subtab.id}
            onClick={() => setActiveSubtab(subtab.id)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeSubtab === subtab.id
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {subtab.label}
          </button>
        ))}
      </div>

      <div>{activeSubtab === '2.a' ? <Subtab2A /> : <Subtab2B />}</div>
    </div>
  );
}

function Subtab2A() {
  const ancVsShaData = [
    { name: 'District 1', 'ANC Visits': 3200, 'SHA Enrollment': 2850 },
    { name: 'District 2', 'ANC Visits': 2900, 'SHA Enrollment': 2650 },
    { name: 'District 3', 'ANC Visits': 3450, 'SHA Enrollment': 3100 },
    { name: 'District 4', 'ANC Visits': 2650, 'SHA Enrollment': 2400 },
  ];

  const hivTestingData = [
    { name: 'HIV Tested', value: 68, fill: '#10b981' },
    { name: 'Not Tested', value: 32, fill: '#e5e7eb' },
  ];

  return (
    <div className="space-y-6">
      {/* Bar Chart: 1st ANC vs SHA */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          1st ANC Visits vs SHA Enrollment
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ancVsShaData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ANC Visits" fill="#10b981" />
            <Bar dataKey="SHA Enrollment" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut Chart: HIV Testing */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          HIV Testing Coverage (1st ANC Visits)
        </h3>
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
          <ResponsiveContainer width={300} height={300}>
            <PieChart>
              <Pie data={hivTestingData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {hivTestingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {hivTestingData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill }} />
                <span className="text-gray-700">{item.name}: {item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Subtab2B() {
  const conversionFunnelData = [
    { stage: 'New HIV+ PBFW', value: 450 },
    { stage: 'Eligible for ART', value: 425 },
    { stage: 'Initiated on ART', value: 385 },
  ];

  const prepData = [
    { name: 'Eligible for PrEP', 'PBFW': 280 },
    { name: 'Initiated on PrEP', 'PBFW': 198 },
  ];

  const missedOpportunitiesData = [
    { month: 'Jan', missed: 45 },
    { month: 'Feb', missed: 38 },
    { month: 'Mar', missed: 42 },
    { month: 'Apr', missed: 35 },
    { month: 'May', missed: 32 },
    { month: 'Jun', missed: 28 },
  ];

  const heiSamplesData = [
    { month: 'Jan', samples: 120 },
    { month: 'Feb', samples: 135 },
    { month: 'Mar', samples: 148 },
    { month: 'Apr', samples: 165 },
    { month: 'May', samples: 178 },
    { month: 'Jun', samples: 192 },
  ];

  return (
    <div className="space-y-6">
      {/* Conversion Funnel */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          HIV Treatment Conversion Funnel
        </h3>
        <div className="space-y-3">
          {conversionFunnelData.map((item, idx) => {
            const percentage = ((item.value / conversionFunnelData[0].value) * 100).toFixed(0);
            const width = (item.value / 450) * 100;
            return (
              <div key={idx}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.stage}</span>
                  <span className="text-sm font-bold text-gray-900">{item.value} ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full flex items-center justify-center text-white text-xs font-bold transition-all"
                    style={{ width: `${width}%` }}
                  >
                    {percentage}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PrEP Comparison */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          PrEP Eligibility vs Initiation (PBFW)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={prepData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="PBFW" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Missed Opportunities */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Missed Opportunities (New Positive - Initiated on ART)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={missedOpportunitiesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} name="Missed Cases" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* HEI EID Samples */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          HEI EID Samples Collected at Birth (Over Time)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={heiSamplesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="samples" stroke="#10b981" strokeWidth={2} name="EID Samples" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
