'use client';

import React from 'react';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const THEME_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

interface ChartCardProps {
  title: string;
  data: any[];
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, data, loading, empty, emptyMessage, className, children }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : empty || !data || data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage || 'No data available'}</p>
          </div>
        ) : (
          <div className="h-64">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

interface LineChartProps {
  data: any[];
  xKey: string;
  lines: { key: string; color?: string; name?: string }[];
  height?: number;
}

export function FarmLineChart({ data, xKey, lines, height = 250 }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name || line.key}
            stroke={line.color || THEME_COLORS[i % THEME_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}

interface AreaChartProps {
  data: any[];
  xKey: string;
  areas: { key: string; color?: string; name?: string; fillColor?: string }[];
  height?: number;
}

export function FarmAreaChart({ data, xKey, areas, height = 250 }: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {areas.map((area, i) => (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            name={area.name || area.key}
            stroke={area.color || THEME_COLORS[i % THEME_COLORS.length]}
            fill={area.fillColor || area.color || THEME_COLORS[i % THEME_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: any[];
  xKey: string;
  bars: { key: string; color?: string; name?: string }[];
  height?: number;
}

export function FarmBarChart({ data, xKey, bars, height = 250 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {bars.map((bar, i) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name || bar.key}
            fill={bar.color || THEME_COLORS[i % THEME_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: { name: string; value: number }[];
  colors?: string[];
  height?: number;
}

export function FarmPieChart({ data, colors, height = 250 }: PieChartProps) {
  const pieColors = colors || THEME_COLORS;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={pieColors[i % pieColors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </RePieChart>
    </ResponsiveContainer>
  );
}
