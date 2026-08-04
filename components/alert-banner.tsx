'use client';

import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface AlertBannerProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

export function AlertBanner({ type, title, message }: AlertBannerProps) {
  const styles = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      title: 'text-emerald-900',
      message: 'text-emerald-700',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      title: 'text-amber-900',
      message: 'text-amber-700',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      title: 'text-red-900',
      message: 'text-red-700',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
      title: 'text-blue-900',
      message: 'text-blue-700',
    },
  };

  const style = styles[type];

  return (
    <div className={`p-4 rounded-lg border flex gap-3 ${style.bg}`}>
      {style.icon}
      <div className="flex-1">
        <p className={`font-semibold text-sm ${style.title}`}>{title}</p>
        <p className={`text-sm ${style.message}`}>{message}</p>
      </div>
    </div>
  );
}
