'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/lib/toasts';

const reportTypes = [
  {
    id: 'income',
    title: 'Income Report',
    description:
      'Detailed breakdown of all sales revenue by farm, crop, and period.',
    icon: TrendingUp,
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'expense',
    title: 'Expense Report',
    description:
      'Comprehensive overview of all expenses categorized by type and farm.',
    icon: TrendingDown,
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    id: 'profit-loss',
    title: 'Profit & Loss',
    description:
      'Net profit and loss statement comparing income against expenses.',
    icon: DollarSign,
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
];

const exportFormats = [
  { id: 'pdf', label: 'PDF', icon: FileText },
  { id: 'excel', label: 'Excel', icon: Download },
  { id: 'csv', label: 'CSV', icon: Download },
];

export default function FinanceReportsPage() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = (format: string, reportType: string) => {
    toast({
      type: 'info',
      title: 'Export coming soon',
      message: `${reportType} export as ${format.toUpperCase()} will be available in a future update.`,
    });
  };

  const handleGenerate = (reportType: string) => {
    toast({
      type: 'info',
      title: 'Report generation coming soon',
      message: `${reportType} generation will be available in a future update.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/finance"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Finance
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Finance Reports
          </h1>
          <p className="text-muted-foreground">
            Generate and export financial reports
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
                placeholder="Start date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
                placeholder="End date"
              />
            </div>
            <Button variant="outline" size="sm">
              This Month
            </Button>
            <Button variant="outline" size="sm">
              This Quarter
            </Button>
            <Button variant="outline" size="sm">
              This Year
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div className="grid gap-4 md:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`rounded-full p-3 ${report.bg}`}>
                  <report.icon className={`h-6 w-6 ${report.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{report.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {report.description}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleGenerate(report.title)}
                >
                  Generate
                </Button>
                {exportFormats.map((fmt) => (
                  <Button
                    key={fmt.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(fmt.id, report.title)}
                  >
                    {fmt.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Export */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport('pdf', 'All Financial Data')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export All (PDF)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('excel', 'All Financial Data')}
            >
              <Download className="mr-2 h-4 w-4" />
              Export All (Excel)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('csv', 'All Financial Data')}
            >
              <Download className="mr-2 h-4 w-4" />
              Export All (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
