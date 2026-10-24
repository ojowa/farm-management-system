'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { poultryHousesAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { poultryHouseFormSchema } from '@/lib/validation';

interface Farm { id: string; name: string; }

export default function EditHousePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('poultry');

  const [form, setForm] = useState({ name: '', farmId: '', capacity: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: houseData } = useFetch<{ data: any }>(`poultry-house-edit-${id}`, () => poultryHousesAPI.get(id), { cacheTime: 30000 });
  const { data: farmsData } = useFetch<{ data: Farm[] }>('farms-edit', () => farmsAPI.list({ limit: 200 }), { cacheTime: 60000 });

  useEffect(() => {
    const h = (houseData as any)?.data ?? houseData;
    if (h) setForm({ name: h.name || '', farmId: h.farmId || '', capacity: h.capacity ? String(h.capacity) : '' });
  }, [houseData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = poultryHouseFormSchema.safeParse({ ...form, capacity: form.capacity ? Number(form.capacity) : 0 });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => { errs[String(issue.path[0])] = issue.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await poultryHousesAPI.update(id, { name: form.name.trim(), farmId: form.farmId, capacity: Number(form.capacity) || 0 });
      toast({ type: 'success', title: 'House updated' });
      clearFetchCache('poultry-houses');
      router.push(`/poultry/houses/${id}`);
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to update', message: err.response?.data?.message || 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const farms = farmsData?.data || [];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href="/poultry/houses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Link>
      <Card>
        <CardHeader><CardTitle>Edit Poultry House</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name <span className="text-destructive">*</span></label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Farm <span className="text-destructive">*</span></label>
              <Select placeholder="Select farm" options={farms.map(f => ({ value: f.id, label: f.name }))} value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })} />
              {errors.farmId && <p className="text-sm text-destructive mt-1">{errors.farmId}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Capacity (birds)</label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push(`/poultry/houses/${id}`)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
