'use client';

import React, { useState, useCallback } from 'react';
import { pestDiseaseAPI, farmsAPI } from '@/lib/api';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { NavTabs } from '@/components/NavTabs';
import { CROPS_TABS } from '@/lib/cropsTabs';
import { usePermission } from '@/lib/usePermission';
import { useToast, getErrorMessage } from '@/lib/toasts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Plus, Bug, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PestDiseaseRecord {
  id: string;
  cropName: string;
  type: string;
  name: string;
  severity: string;
  affectedArea: string;
  identifiedDate: string;
  treatment: string;
  status: string;
}

const severityColors: Record<string, 'destructive' | 'warning' | 'default' | 'secondary'> = {
  CRITICAL: 'destructive',
  HIGH: 'destructive',
  MEDIUM: 'warning',
  LOW: 'default',
  MINOR: 'secondary',
};

const typeColors: Record<string, string> = {
  PEST: 'bg-red-100 text-red-800',
  DISEASE: 'bg-orange-100 text-orange-800',
  WEED: 'bg-yellow-100 text-yellow-800',
};

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'PEST', label: 'Pest' },
  { value: 'DISEASE', label: 'Disease' },
  { value: 'WEED', label: 'Weed' },
];

const severityOptions = [
  { value: '', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'MINOR', label: 'Minor' },
];

export default function PestDiseasePage() {
  const { canCreate } = usePermission();
  const { toast } = useToast();
  const isReadOnly = !canCreate('crop');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    farmId: '',
    type: 'PEST',
    name: '',
    severity: 'LOW',
    identifiedDate: '',
    treatment: '',
    notes: '',
  });

  const fetchKey = `pest-disease-list-${typeFilter}-${severityFilter}-${search}`;

  const { data, loading: isLoading, error, refetch } = useFetch<{ data: PestDiseaseRecord[] }>(
    fetchKey,
    useCallback(async () => {
      return await pestDiseaseAPI.list({
        type: typeFilter || undefined,
        severity: severityFilter || undefined,
        search: search || undefined,
      });
    }, [typeFilter, severityFilter, search])
  );

  const { data: farmsData } = useFetch<{ data: any[] }>(
    'farms-for-pest-disease',
    useCallback(async () => await farmsAPI.list({ limit: 200 }), [])
  );

  const records = data?.data || [];
  const farms = farmsData?.data || [];

  const emptyForm = { farmId: '', type: 'PEST', name: '', severity: 'LOW', identifiedDate: '', treatment: '', notes: '' };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.farmId || !form.name || !form.identifiedDate) {
      toast({ type: 'warning', title: 'Please select a farm and fill in the name and date' });
      return;
    }
    setSaving(true);
    try {
      await pestDiseaseAPI.create({
        farmId: form.farmId,
        type: form.type,
        name: form.name,
        severity: form.severity,
        identifiedDate: new Date(form.identifiedDate).toISOString(),
        ...(form.treatment ? { treatment: form.treatment } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      });
      toast({ type: 'success', title: 'Record created' });
      setShowCreate(false);
      setForm(emptyForm);
      clearFetchCache('pest-disease');
      refetch();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to create record', message: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Pest & Disease Records</h1>
        </div>
        {!isReadOnly && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Record
          </Button>
        )}
      </div>

      <NavTabs ariaLabel="Crops section" tabs={CROPS_TABS} />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={typeOptions} />
            <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} options={severityOptions} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6 text-center text-destructive">
            Failed to load records. Please try again.
          </CardContent>
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bug className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No records found</p>
            <p className="text-sm text-muted-foreground">
              {typeFilter || severityFilter || search
                ? 'Try adjusting your filters'
                : 'Create your first pest & disease record to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Crop</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Affected Area</th>
                  <th className="px-4 py-3">Date Identified</th>
                  <th className="px-4 py-3">Treatment</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${typeColors[record.type] || ''}`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{record.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{record.cropName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={severityColors[record.severity] || 'default'}>
                        {record.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{record.affectedArea}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(record.identifiedDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                      {record.treatment || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate} title="New Pest & Disease Record">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Farm *</label>
              <Select
                value={form.farmId}
                onChange={(e) => setForm({ ...form, farmId: e.target.value })}
                options={[{ value: '', label: 'Select farm...' }, ...farms.map((f: any) => ({ value: f.id, label: f.name }))]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                options={[
                  { value: 'PEST', label: 'Pest' },
                  { value: 'DISEASE', label: 'Disease' },
                  { value: 'WEED', label: 'Weed' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Fall Armyworm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <Select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date Identified *</label>
              <Input type="date" value={form.identifiedDate} onChange={(e) => setForm({ ...form, identifiedDate: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Treatment (optional)</label>
            <textarea value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Record</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
