import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  gradient = 'from-card to-card/50',
}: StatsCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${gradient} p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:border-primary/30 group`}
    >
      {/* Background Decorative Glow */}
      <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-all duration-300" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className="rounded-xl bg-secondary/50 p-2.5 text-primary group-hover:scale-110 transition-all duration-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend.value}%
          </span>
        )}
      </div>

      {description && <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
