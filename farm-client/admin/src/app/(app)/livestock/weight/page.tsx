'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { NavTabs } from '@/components/NavTabs';
import { livestockAPI, weightAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/toasts';
import { usePermission } from '@/lib/usePermission';

interface Animal { id: string; species: string; breed?: string; }
interface WeightRecord { id: string; weight: number; unit: string; recordedDate: string; notes?: string | null; }

function listFrom(response: any): any[] {
  const body = response?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.livestock)) return body.livestock;
  return [];
}

export default function LivestockWeightPage() {
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const canWrite = canCreate('livestock');
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalId, setAnimalId] = useState('');
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('kg');
  const [recordedDate, setRecordedDate] = useState(new Date().toISOString().slice(0, 10));

  const loadAnimals = useCallback(async () => {
    try {
      const response = await livestockAPI.list({ limit: 100 });
      const list = listFrom(response) as Animal[];
      setAnimals(list);
      setAnimalId((current) => current || list[0]?.id || '');
    } catch (error: any) {
      toast({ type: 'error', title: 'Failed to load livestock', message: error.response?.data?.message || 'Could not load livestock.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadRecords = useCallback(async () => {
    if (!animalId) { setRecords([]); return; }
    try {
      const response = await weightAPI.listByAnimal(animalId);
      setRecords(listFrom(response));
    } catch (error: any) {
      toast({ type: 'error', title: 'Failed to load weight records', message: error.response?.data?.message || 'Could not load weight records.' });
    }
  }, [animalId, toast]);

  useEffect(() => { void loadAnimals(); }, [loadAnimals]);
  useEffect(() => { void loadRecords(); }, [loadRecords]);

  async function saveRecord(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(weight);
    if (!animalId || !Number.isFinite(value) || value <= 0 || !unit.trim() || !recordedDate) {
      toast({ type: 'error', title: 'Invalid weight record', message: 'Choose an animal and enter a positive weight, unit, and date.' });
      return;
    }
    setSaving(true);
    try {
      await weightAPI.recordForAnimal(animalId, { weight: value, unit: unit.trim(), recordedDate });
      setWeight('');
      toast({ type: 'success', title: 'Weight recorded' });
      await loadRecords();
    } catch (error: any) {
      toast({ type: 'error', title: 'Failed to record weight', message: error.response?.data?.message || 'Could not save the weight record.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <NavTabs tabs={[
        { label: 'Livestock', href: '/livestock' },
        { label: 'Health', href: '/livestock/health' },
        { label: 'Vaccinations', href: '/livestock/vaccinations' },
        { label: 'Weight', href: '/livestock/weight' },
        { label: 'Breeding', href: '/livestock/breeding' },
      ]} />
      <h1 className="text-2xl font-bold">Livestock Weight</h1>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <label className="block text-sm font-medium">Animal
            <select className="mt-1 w-full rounded-md border bg-background p-2" value={animalId} onChange={(event) => setAnimalId(event.target.value)} disabled={loading}>
              {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.species}{animal.breed ? ` · ${animal.breed}` : ''}</option>)}
            </select>
          </label>
        </CardContent>
      </Card>
      {canWrite && (
        <Card>
          <CardHeader><CardTitle>Record weight</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveRecord} className="grid gap-4 sm:grid-cols-4">
              <Input type="number" min="0.01" step="any" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Weight" required />
              <Input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Unit" required />
              <Input type="date" value={recordedDate} onChange={(event) => setRecordedDate(event.target.value)} required />
              <Button type="submit" loading={saving} disabled={saving || !animalId}>Save weight</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Weight history</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading records…</p> : records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No weight records for this animal.</p>
          ) : (
            <div className="divide-y">
              {records.map((record) => (
                <div key={record.id} className="flex justify-between py-3">
                  <span className="font-medium">{record.weight} {record.unit}</span>
                  <span className="text-sm text-muted-foreground">{new Date(record.recordedDate).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
