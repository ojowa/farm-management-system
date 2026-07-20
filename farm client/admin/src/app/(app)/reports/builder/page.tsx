'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Download,
  Eye,
  Save,
  Home,
  Sprout,
  Beef,
  Egg,
  DollarSign,
  Package,
  Users,
  BarChart3,
  Calendar,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/toasts';
import { useReadOnly } from '@/lib/useReadOnly';
import { exportToCSV, exportToJSON, exportToPDF } from '@/lib/export';

type DataSource = 'farms' | 'crops' | 'livestock' | 'poultry' | 'inventory' | 'workers' | 'finance';
type ChartType = 'table' | 'bar' | 'line' | 'pie' | 'stat';

interface ReportField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
}

interface ReportWidget {
  id: string;
  type: ChartType;
  title: string;
  dataSource: DataSource;
  fields: string[];
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  aggregateField?: string;
}

const dataSources: { id: DataSource; label: string; icon: React.ElementType; fields: ReportField[] }[] = [
  {
    id: 'farms',
    label: 'Farms',
    icon: Home,
    fields: [
      { id: 'name', name: 'Name', type: 'text' },
      { id: 'location', name: 'Location', type: 'text' },
      { id: 'size', name: 'Size', type: 'number' },
      { id: 'status', name: 'Status', type: 'select' },
      { id: 'createdAt', name: 'Created Date', type: 'date' },
    ],
  },
  {
    id: 'crops',
    label: 'Crops',
    icon: Sprout,
    fields: [
      { id: 'name', name: 'Name', type: 'text' },
      { id: 'cropType', name: 'Crop Type', type: 'text' },
      { id: 'area', name: 'Area', type: 'number' },
      { id: 'status', name: 'Status', type: 'select' },
      { id: 'createdAt', name: 'Created Date', type: 'date' },
    ],
  },
  {
    id: 'livestock',
    label: 'Livestock',
    icon: Beef,
    fields: [
      { id: 'species', name: 'Species', type: 'text' },
      { id: 'breed', name: 'Breed', type: 'text' },
      { id: 'gender', name: 'Gender', type: 'select' },
      { id: 'status', name: 'Status', type: 'select' },
      { id: 'birthDate', name: 'Birth Date', type: 'date' },
    ],
  },
  {
    id: 'poultry',
    label: 'Poultry',
    icon: Egg,
    fields: [
      { id: 'batchCode', name: 'Batch Code', type: 'text' },
      { id: 'birdCount', name: 'Bird Count', type: 'number' },
      { id: 'breed', name: 'Breed', type: 'text' },
      { id: 'status', name: 'Status', type: 'select' },
      { id: 'arrivalDate', name: 'Arrival Date', type: 'date' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    fields: [
      { id: 'name', name: 'Name', type: 'text' },
      { id: 'category', name: 'Category', type: 'text' },
      { id: 'quantity', name: 'Quantity', type: 'number' },
      { id: 'unit', name: 'Unit', type: 'text' },
      { id: 'createdAt', name: 'Created Date', type: 'date' },
    ],
  },
  {
    id: 'workers',
    label: 'Workers',
    icon: Users,
    fields: [
      { id: 'name', name: 'Name', type: 'text' },
      { id: 'role', name: 'Role', type: 'text' },
      { id: 'createdAt', name: 'Created Date', type: 'date' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    fields: [
      { id: 'title', name: 'Title', type: 'text' },
      { id: 'amount', name: 'Amount', type: 'number' },
      { id: 'date', name: 'Date', type: 'date' },
      { id: 'type', name: 'Type', type: 'select' },
    ],
  },
];

const widgetTypes: { id: ChartType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'table', label: 'Data Table', icon: FileText, description: 'Tabular data display' },
  { id: 'stat', label: 'Stat Card', icon: BarChart3, description: 'Single metric display' },
  { id: 'bar', label: 'Bar Chart', icon: BarChart3, description: 'Compare categories' },
  { id: 'line', label: 'Line Chart', icon: BarChart3, description: 'Trends over time' },
  { id: 'pie', label: 'Pie Chart', icon: BarChart3, description: 'Distribution breakdown' },
];

const aggregations = [
  { id: 'count', label: 'Count' },
  { id: 'sum', label: 'Sum' },
  { id: 'avg', label: 'Average' },
  { id: 'min', label: 'Minimum' },
  { id: 'max', label: 'Maximum' },
];

export default function ReportBuilderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = useReadOnly();
  const [reportName, setReportName] = useState('');
  const [widgets, setWidgets] = useState<ReportWidget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const addWidget = (type: ChartType) => {
    const newWidget: ReportWidget = {
      id: `widget-${Date.now()}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
      dataSource: 'farms',
      fields: ['name'],
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget.id);
  };

  const updateWidget = (id: string, updates: Partial<ReportWidget>) => {
    setWidgets(widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id));
    if (selectedWidget === id) setSelectedWidget(null);
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    const fromIndex = widgets.findIndex((w) => w.id === draggedWidget);
    const toIndex = widgets.findIndex((w) => w.id === targetId);

    const newWidgets = [...widgets];
    const [moved] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, moved);
    setWidgets(newWidgets);
    setDraggedWidget(null);
  };

  const handleSave = () => {
    if (!reportName.trim()) {
      toast({ type: 'error', title: 'Report name is required' });
      return;
    }
    if (widgets.length === 0) {
      toast({ type: 'error', title: 'Add at least one widget' });
      return;
    }
    toast({
      type: 'success',
      title: 'Report saved',
      message: `"${reportName}" has been saved as a custom report.`,
    });
  };

  const handleExport = (format: 'csv' | 'json' | 'pdf') => {
    if (widgets.length === 0) {
      toast({ type: 'error', title: 'Add widgets before exporting' });
      return;
    }

    const sampleData = widgets.map((w) => ({
      widget: w.title,
      type: w.type,
      dataSource: w.dataSource,
      fields: w.fields.join(', '),
      aggregation: w.aggregation || 'none',
    }));

    switch (format) {
      case 'csv':
        exportToCSV(sampleData, reportName || 'custom-report');
        break;
      case 'json':
        exportToJSON(sampleData, reportName || 'custom-report');
        break;
      case 'pdf':
        exportToPDF({
          title: reportName || 'Custom Report',
          widgets: widgets.map((w) => ({
            title: w.title,
            type: w.type,
            dataSource: w.dataSource,
          })),
        });
        break;
    }

    toast({ type: 'success', title: `Exported as ${format.toUpperCase()}` });
  };

  const activeWidget = widgets.find((w) => w.id === selectedWidget);
  const activeSource = dataSources.find((s) => s.id === activeWidget?.dataSource);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/reports"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Reports
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Custom Report Builder</h1>
          <p className="text-muted-foreground">
            Design custom reports by adding and arranging widgets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          {!readOnly && (
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Report
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - Widget Types */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Widgets</CardTitle>
              <CardDescription>Click or drag to add</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {widgetTypes.map((wt) => {
                const Icon = wt.icon;
                return (
                  <button
                    key={wt.id}
                    onClick={() => addWidget(wt.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="p-2 rounded-md bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{wt.label}</p>
                      <p className="text-xs text-muted-foreground">{wt.description}</p>
                    </div>
                    <Plus className="h-4 w-4 ml-auto text-muted-foreground" />
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Report Name */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Report Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Report Name</label>
                <Input
                  placeholder="My Custom Report"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Widgets</label>
                <p className="text-sm text-muted-foreground">{widgets.length} widget(s) added</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center - Canvas */}
        <div className="col-span-6">
          <Card className="min-h-[500px]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Report Canvas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {widgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    No widgets yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click a widget type on the left to add it to your report
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {widgets.map((widget, index) => {
                    const source = dataSources.find((s) => s.id === widget.dataSource);
                    const SourceIcon = source?.icon || FileText;
                    return (
                      <div
                        key={widget.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, widget.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, widget.id)}
                        onClick={() => setSelectedWidget(widget.id)}
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedWidget === widget.id
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div className="p-2 rounded-md bg-muted">
                          <SourceIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{widget.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {source?.label} • {widget.type}
                            {widget.aggregation && ` • ${widget.aggregation}`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {widget.type}
                        </Badge>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeWidget(widget.id);
                          }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Widget Config */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Widget Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {activeWidget ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Title</label>
                    <Input
                      value={activeWidget.title}
                      onChange={(e) =>
                        updateWidget(activeWidget.id, { title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Data Source</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={activeWidget.dataSource}
                      onChange={(e) =>
                        updateWidget(activeWidget.id, {
                          dataSource: e.target.value as DataSource,
                          fields: [],
                        })
                      }
                    >
                      {dataSources.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Fields</label>
                    <div className="space-y-2">
                      {activeSource?.fields.map((field) => (
                        <label
                          key={field.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={activeWidget.fields.includes(field.id)}
                            onChange={(e) => {
                              const newFields = e.target.checked
                                ? [...activeWidget.fields, field.id]
                                : activeWidget.fields.filter((f) => f !== field.id);
                              updateWidget(activeWidget.id, { fields: newFields });
                            }}
                            className="rounded border-input"
                          />
                          {field.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  {(activeWidget.type === 'stat' || activeWidget.type === 'bar') && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Aggregation</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={activeWidget.aggregation || ''}
                        onChange={(e) =>
                          updateWidget(activeWidget.id, {
                            aggregation: e.target.value as any,
                          })
                        }
                      >
                        <option value="">None</option>
                        {aggregations.map((agg) => (
                          <option key={agg.id} value={agg.id}>
                            {agg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeWidget.aggregation && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Aggregate Field
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={activeWidget.aggregateField || ''}
                        onChange={(e) =>
                          updateWidget(activeWidget.id, {
                            aggregateField: e.target.value,
                          })
                        }
                      >
                        <option value="">Select field</option>
                        {activeSource?.fields
                          .filter((f) => f.type === 'number')
                          .map((field) => (
                            <option key={field.id} value={field.id}>
                              {field.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Select a widget to configure
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport('csv')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export as CSV
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport('json')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export as JSON
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport('pdf')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
