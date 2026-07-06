'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  Clock,
  Calendar,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { scheduledReportsAPI } from '@/lib/api';
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

interface ScheduledReport {
  id: string;
  name: string;
  template: string;
  frequency: string;
  status: string;
  nextSendAt: string;
  recipients: string[];
}

const frequencyLabels: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
};

export default function ScheduledReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await scheduledReportsAPI.list();
      const data = res.data?.data || res.data || [];
      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to load scheduled reports',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete scheduled report "${name}"?`)) return;
    setDeleting(id);
    try {
      await scheduledReportsAPI.delete(id);
      toast({ type: 'success', title: 'Scheduled report deleted' });
      loadReports();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete report',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled Reports</h1>
          <p className="text-muted-foreground">
            Manage automated report delivery schedules
          </p>
        </div>
        <Link href="/reports/scheduled/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Schedule
          </Button>
        </Link>
      </div>

      <Card>
        {loading ? (
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        ) : reports.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No scheduled reports yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create a schedule to automatically send reports on a recurring basis.
            </p>
            <Link href="/reports/scheduled/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Schedule
              </Button>
            </Link>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Send</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{report.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.template}</Badge>
                    </TableCell>
                    <TableCell>
                      {frequencyLabels[report.frequency] || report.frequency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Calendar className="h-3 w-3" />
                        {report.nextSendAt
                          ? new Date(report.nextSendAt).toLocaleDateString()
                          : '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(report.id, report.name)}
                        disabled={deleting === report.id}
                      >
                        {deleting === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
