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
}

export function OverviewChart({ data }: OverviewChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { format } = useCurrency();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-border bg-card/50">
        <span className="text-sm text-muted-foreground animate-pulse">Loading Chart...</span>
      </div>
    );
  }

  const chartData = data || defaultData;

  return (
    <div className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md">
      <div className="mb-4">
        <h3 className="font-bold text-lg">Financial Overview</h3>
        <p className="text-xs text-muted-foreground">Monthly breakdown of income and expenses</p>
      </div>

      <div className="h-80 w-full">
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

