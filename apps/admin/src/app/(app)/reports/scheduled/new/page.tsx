'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { scheduledReportsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/lib/toasts';

const TEMPLATES = [
  { value: 'FINANCIAL_SUMMARY', label: 'Financial Summary' },
  { value: 'CROP_PRODUCTION', label: 'Crop Production' },
  { value: 'LIVESTOCK_INVENTORY', label: 'Livestock Inventory' },
  { value: 'POULTRY_REPORT', label: 'Poultry Report' },
  { value: 'INVENTORY_STATUS', label: 'Inventory Status' },
  { value: 'FARM_OVERVIEW', label: 'Farm Overview' },
  { value: 'WEATHER_SUMMARY', label: 'Weather Summary' },
];

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

export default function NewScheduledReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    template: '',
    frequency: '',
    recipients: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.template) errs.template = 'Template is required';
    if (!form.frequency) errs.frequency = 'Frequency is required';
    if (!form.recipients.trim()) errs.recipients = 'At least one recipient is required';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const recipients = form.recipients
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      await scheduledReportsAPI.create({
        name: form.name.trim(),
        template: form.template,
        frequency: form.frequency,
        recipients,
      });

      toast({ type: 'success', title: 'Scheduled report created' });
      router.push('/reports/scheduled');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create schedule',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/reports/scheduled">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Scheduled Report</h1>
          <p className="text-muted-foreground">
            Set up automated report delivery
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Report Schedule Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Schedule Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Monthly Financial Report"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Template <span className="text-destructive">*</span>
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
              >
                <option value="">Select a template</option>
                {TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {errors.template && (
                <p className="text-sm text-destructive mt-1">{errors.template}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Frequency <span className="text-destructive">*</span>
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              >
                <option value="">Select frequency</option>
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              {errors.frequency && (
                <p className="text-sm text-destructive mt-1">{errors.frequency}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Recipients <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="email1@example.com, email2@example.com"
                value={form.recipients}
                onChange={(e) => setForm({ ...form, recipients: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of email addresses
              </p>
              {errors.recipients && (
                <p className="text-sm text-destructive mt-1">{errors.recipients}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/reports/scheduled">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={saving}>
                Create Schedule
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
