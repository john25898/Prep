'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { StatusBadge } from '@/components/status-badge';

export function ComplianceTab() {
  // BEmONC Signal Functions Compliance
  const bemoncData = [
    { name: 'IV Oxytocin', value: 95 },
    { name: 'Antibiotics', value: 92 },
    { name: 'Anticonvulsants', value: 88 },
    { name: 'MVA/Manual Removal', value: 85 },
    { name: 'Assisted Vaginal Delivery', value: 90 },
  ];

  // CEmONC Signal Functions Compliance
  const cemoncData = [
    { framework: 'Blood Transfusion', compliance: 94, status: 'green' },
    { framework: 'Neonatal Resuscitation', compliance: 91, status: 'green' },
    { framework: 'Cesarean Section', compliance: 96, status: 'green' },
    { framework: 'ICU/NICU Capacity', compliance: 88, status: 'amber' },
  ];

  // Essential Newborn Care (ENC) Bundles
  const encBundlesData = [
    { bundle: 'Delayed Cord Clamping', compliance: 85 },
    { bundle: 'Skin-to-Skin Contact', compliance: 92 },
    { bundle: 'Early Breastfeeding', compliance: 88 },
    { bundle: 'Vitamin K & Eye Care', compliance: 96 },
  ];

  return (
    <div className="space-y-6">
      {/* EmONC framing */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-5 border border-emerald-200">
        <h3 className="font-semibold text-emerald-900">
          EmONC Compliance — Emergency Obstetric &amp; Newborn Care
        </h3>
        <p className="text-sm text-emerald-800 mt-1">
          BEmONC (item 3.5), CEmONC (item 3.6) and Essential Newborn Care (item
          3.7) signal functions. Facility-level readiness for these is recorded
          in the Domain 3 assessment (App Launcher) and shown under Readiness
          Insights.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">BEmONC Functions Available</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">5/5</p>
          <p className="text-xs text-gray-500 mt-1">100% Compliant</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">CEmONC Functions Available</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">4/4</p>
          <p className="text-xs text-gray-500 mt-1">100% Compliant</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <p className="text-sm text-gray-600 font-medium">ENC Bundles Implemented</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">3/4</p>
          <p className="text-xs text-gray-500 mt-1">75% Compliant</p>
        </div>
      </div>

      {/* BEmONC Signal Functions */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          BEmONC (Basic Emergency &amp; Newborn Care) Signal Functions
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={bemoncData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
            <Radar
              name="Compliance %"
              dataKey="value"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* CEmONC Signal Functions */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          CEmONC (Comprehensive Emergency &amp; Newborn Care) Functions
        </h3>
        <div className="space-y-3">
          {cemoncData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{item.framework}</p>
                <p className="text-sm text-gray-600">{item.compliance}% compliant</p>
              </div>
              <StatusBadge status={item.status as any} label={`${item.compliance}%`} />
            </div>
          ))}
        </div>
      </div>

      {/* Essential Newborn Care (ENC) Bundles */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Essential Newborn Care (ENC) Bundles Implementation
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={encBundlesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bundle" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="compliance" fill="#10b981" name="Compliance %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
