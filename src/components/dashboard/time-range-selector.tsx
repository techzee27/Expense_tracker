'use client';

import React from 'react';
import { TimeRange } from '@/hooks/use-chart-filter';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  className?: string;
}

export function TimeRangeSelector({ value, onChange, className = '' }: TimeRangeSelectorProps) {
  const options: { label: string; val: TimeRange }[] = [
    { label: 'Day', val: 'day' },
    { label: 'Week', val: 'week' },
    { label: 'Month', val: 'month' },
  ];

  return (
    <div className={`inline-flex p-1 rounded-xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-lg ${className}`}>
      {options.map((opt) => {
        const isActive = value === opt.val;
        return (
          <button
            key={opt.val}
            onClick={() => onChange(opt.val)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ${
              isActive
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-950/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
