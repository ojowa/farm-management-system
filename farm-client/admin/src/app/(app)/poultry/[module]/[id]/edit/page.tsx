'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { poultryAPI, flocksAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { useToast } from '@/lib/toasts';
import { poultryRecordConfigs, unwrapPoultryRecord, type PoultryRecordField } from '../../../record-config';

interface FlockOption {
  id: string;
  batchCode: string;
}

function inputValue(field: PoultryRecordField, value: unknown): string {
  if (value == null) return '';
  if (field.type === 'date') return String(value).slice(0, 10);
  return String(value);
}

export default function EditPoultryRecordPage() {
  const { module, id } = useParams<{ module: string; id: string }>();
  const router = useRouter();
  const { canUpdate } = usePermission();
  const { toast } = useToast();
  const config = poultryRecordConfigs[module];
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { data, loading, error } = useFetch<{ data: Record<string, any> }>(
    `poultry-record-${module}-${id}`,
    () => config.api.get(id),
    { enabled: !!config },
  );
  const { data: flockData } = useFetch<{ data: FlockOption[] }>(
    'poultry-record-flocks',
    () => poultryAPI.list({ limit: 500 }),
    { enabled: !!config && config.fields.some((field) => field.type === 'flock') },
  );
  const record = data ? unwrapPoultryRecord(data) : null;
  const flocks = flockData?.data ?? [];

  useEffect(() => {
    if (!record || !config) return;
    setValues(Object.fromEntries(config.fields.map((field) => [field.key, inputValue(field, record[field.key])])));
  }, [record, config]);

  if (!config) return <p className="p-6 text-destructive">Poultry record type not found.</p>;
  if (!canUpdate('poultry')) return <p className="p-6 text-destructive">You do not have permission to edit this record.</p>;
  if (loading) return <LoadingSpinner />;
  if (error || !record) return <p className="p-6 text-destructive">{error || 'Record not found.'}</p>;

  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of config.fields) {
        const value = values[field.key] ?? '';
        if (!value && field.nullable) {
          payload[field.key] = null;
        } else if (!value) {
          continue;
        } else if (field.type === 'number') {
          const number = Number(value);
          if (!Number.isFinite(number)) throw new Error(`${field.label} must be a number.`);
          payload[field.key] = number;
        } else {
          payload[field.key] = value;
        }
      }
      await config.api.update(id, payload);
      clearFetchCache(`poultry-record-${module}-${id}`);
      toast({ type: 'success', title: `${config.title} updated` });
      router.push(`/poultry/${module}/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: `Failed to update ${config.title.toLowerCase()}`,
        message: err.response?.data?.message || err.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Button variant="ghost" onClick={() => router.push(`/poultry/${module}/${id}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to record
      </Button>
      <Card>
        <CardHeader><CardTitle>Edit {config.title}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {config.fields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium">{field.label}</label>
                {field.type === 'flock' ? (
                  <Select
                    placeholder="Select a flock"
                    options={flocks.map((flock) => ({ value: flock.id, label: flock.batchCode }))}
                    value={values[field.key] ?? ''}
                    onChange={(event) => setValue(field.key, event.target.value)}
                  />
                ) : field.type === 'status' ? (
                  <Select
                    placeholder="Select a status"
                    options={['ACTIVE', 'COMPLETED', 'CANCELLED'].map((status) => ({ value: status, label: status }))}
                    value={values[field.key] ?? ''}
                    onChange={(event) => setValue(field.key, event.target.value)}
                  />
                ) : (
                  <Input
                    type={field.type === 'textarea' ? 'text' : field.type}
                    value={values[field.key] ?? ''}
                    onChange={(event) => setValue(field.key, event.target.value)}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" loading={saving} disabled={saving}>Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
