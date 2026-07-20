import * as React from 'react';
import { cn } from '../lib/cn';

export interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

function StatsCard({ icon, label, value, trend, trendValue, className }: StatsCardProps) {
  const trendColors = { up: 'text-green-600', down: 'text-red-600', neutral: 'text-gray-500' };
  const trendIcons = { up: '↑', down: '↓', neutral: '→' };
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6', className)}>
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        {trend && trendValue && (
          <div className={cn('text-sm font-medium', trendColors[trend])}>
            <span>{trendIcons[trend]}</span> {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}

export { StatsCard };
