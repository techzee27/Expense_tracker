'use client';

import { useState, useEffect } from 'react';

export type TimeRange = 'day' | 'week' | 'month';

export function useChartFilter(chartId: string, initialValue: TimeRange = 'month') {
  const [range, setRange] = useState<TimeRange>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem(`chart-filter-${chartId}`);
      if (saved === 'day' || saved === 'week' || saved === 'month') {
        setRange(saved as TimeRange);
      }
      setIsInitialized(true);
    }
  }, [chartId]);

  const updateRange = (newRange: TimeRange) => {
    setRange(newRange);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`chart-filter-${chartId}`, newRange);
    }
  };

  return [range, updateRange, isInitialized] as const;
}
