'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Sprout,
  Beef,
  Egg,
  DollarSign,
  BarChart3,
  FileText,
  Calendar,
  Download,
  ChevronRight,
  Clock,
  CheckCircle,
  Loader2,
  Plus,
  Wand2,
} from 'lucide-react';
import { reportsAPI } from '@/lib/api';
import { exportToCSV, exportToJSON, exportToPDF } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/lib/toasts';
import { useFetch } from '@/hooks/useFetch';

interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  href: string;
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'farm-summary',
    title: 'Farm Summary',
    description: 'Overview of all farm properties, sizes, and key metrics.',
    icon: Home,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    href: '/farms',
  },
  {
    id: 'crop-report',
    title: 'Crop Report',
    description: 'Detailed report on crop yields, health, and production statistics.',
    icon: Sprout,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    href: '/crops',
  },
  {
    id: 'livestock-report',
    title: 'Livestock Report',
    description: 'Livestock inventory, health status, and breeding records.',
    icon: Beef,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    href: '/livestock',
  },
  {
    id: 'poultry-report',
    title: 'Poultry Report',
    description: 'Poultry flock statistics, egg production, and health tracking.',
    icon: Egg,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    href: '/poultry/flocks',
  },
  {
    id: 'financial-report',
    title: 'Financial Report',
    description: 'Complete financial overview including income, expenses, and profit.',
    icon: DollarSign,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    href: '/finance',
  },
  {
    id: 'inventory-report',
    title: 'Inventory Report',
    description: 'Stock levels, consumption rates, and reorder alerts.',
    icon: BarChart3,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    href: '/inventory',
  },
];

interface ReportRecord {
  id: string;
  name: string;
  type: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: reportsData } = useFetch<{ data: { reports: any[] } }>(
    'reports-list',
    () => reportsAPI.list({ limit: 50 }),
    { cacheTime: 30_000 }
  );

  const recentReports: ReportRecord[] = (reportsData?.data?.reports || []).map((r: any) => ({
    id: r.id,
    name: r.title || r.name || 'Untitled Report',
    type: r.type || r.template || 'Report',
    date: r.createdAt || r.date || new Date().toISOString(),
    status: (r.status || 'completed') as 'completed' | 'pending' | 'failed',
  }));

  const handleGenerate = async (template: ReportTemplate) => {
    setGenerating(template.id);
    try {
      await reportsAPI.generate(template.id);
      toast({
        type: 'success',
        title: 'Report generated',
        message: `${template.title} has been generated successfully.`,
      });
    } catch (err: any) {
      toast({
        type: 'info',
        title: 'Report generation',
        message: `${template.title} generation will be fully available in a future update.`,
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = (reportName: string) => {
    toast({
      type: 'info',
      title: 'Download coming soon',
      message: `Downloading "${reportName}" will be available in a future update.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate, view, and download farm reports
          </p>
        </div>
        <Link href="/reports/builder">
          <Button>
            <Wand2 className="mr-2 h-4 w-4" />
            Create Custom Report
          </Button>
        </Link>
      </div>

      {/* Report Templates */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Report Templates</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow border-dashed">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="rounded-xl p-3 bg-primary/10">
                  <Wand2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Custom Report</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build your own report with drag-and-drop widgets
                  </p>
                </div>
              </div>
              <Link href="/reports/builder">
                <Button variant="default" size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Build Custom Report
                </Button>
              </Link>
            </CardContent>
          </Card>
          {reportTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`rounded-xl p-3 ${template.bg}`}>
                      <Icon className={`h-6 w-6 ${template.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{template.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      loading={generating === template.id}
                      onClick={() => handleGenerate(template)}
                    >
                      {generating === template.id ? (
                        <>Generating...</>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate
                        </>
                      )}
                    </Button>
                    <Link href={template.href}>
                      <Button variant="outline" size="sm">
                        View Data
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Reports
          </CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </CardHeader>
        {recentReports.length === 0 ? (
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No reports generated yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Generate&quot; on a template above to create your first report.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{report.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">{report.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            exportToCSV(
                              [{ name: report.name, type: report.type, date: report.date }],
                              report.name.replace(/\s+/g, '-').toLowerCase()
                            )
                          }
                          title="Export CSV"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            exportToJSON(
                              [{ name: report.name, type: report.type, date: report.date }],
                              report.name.replace(/\s+/g, '-').toLowerCase()
                            )
                          }
                          title="Export JSON"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            exportToPDF({
                              title: report.name,
                              widgets: [{ title: report.type, type: 'table', dataSource: 'farms' }],
                            })
                          }
                          title="Export PDF"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{recentReports.length}</p>
            <p className="text-sm text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{reportTemplates.length}</p>
            <p className="text-sm text-muted-foreground">Report Types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">This Month</p>
            <p className="text-sm text-muted-foreground">Latest Report</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
