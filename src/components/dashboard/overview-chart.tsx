'use client';

import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useCurrency } from '@/hooks/use-currency';
import { TimeRangeSelector } from '@/components/dashboard/time-range-selector';

interface ChartDataPoint {
  month: string;
  income: number;
  expense: number;
}

const defaultData: ChartDataPoint[] = [
  { month: 'Jan', income: 1200, expense: 950 },
  { month: 'Feb', income: 1500, expense: 1100 },
  { month: 'Mar', income: 1400, expense: 980 },
  { month: 'Apr', income: 1800, expense: 1250 },
  { month: 'May', income: 2000, expense: 1300 },
  { month: 'Jun', income: 1750, expense: 1400 },
];

interface OverviewChartProps {
  data?: ChartDataPoint[];
  timeRange: 'day' | 'week' | 'month';
  onTimeRangeChange: (value: 'day' | 'week' | 'month') => void;
  isLoading?: boolean;
}

export function OverviewChart({ data, timeRange, onTimeRangeChange, isLoading = false }: OverviewChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { format } = useCurrency();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card/50">
        <span className="text-sm text-muted-foreground animate-pulse">Loading Chart...</span>
      </div>
    );
  }

  const chartData = data || [];
  const isEmpty = chartData.length === 0;

  return (
    <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md relative overflow-hidden transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-bold text-lg">Financial Overview</h3>
          <p className="text-xs text-muted-foreground">Breakdown of income and expenses aggregated by selected view</p>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
        </div>
      </div>

      <div className="h-64 w-full relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] z-10 rounded-xl transition-opacity duration-350">
            <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              Updating aggregation...
            </span>
          </div>
        )}
        
        {isEmpty && !isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0f17]/30 border border-dashed border-slate-800 rounded-xl text-center p-6 z-10">
            <p className="text-sm font-semibold text-slate-400">No transactions recorded</p>
            <p className="text-xs text-slate-500 max-w-[280px] mt-1">There are no records matching the selected {timeRange} filter.</p>
          </div>
        ) : null}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => format(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '12px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value: any, name: any) => [format(Number(value)), name]}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area
              type="monotone"
              name="Income"
              dataKey="income"
              stroke="#a855f7"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorIncome)"
            />
            <Area
              type="monotone"
              name="Expense"
              dataKey="expense"
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorExpense)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

