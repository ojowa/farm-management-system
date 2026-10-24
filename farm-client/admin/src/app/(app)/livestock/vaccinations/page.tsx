'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { NavTabs } from '@/components/NavTabs';
import { livestockAPI, livestockHealthAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/toasts';
import { usePermission } from '@/lib/usePermission';

interface Animal { id: string; species: string; breed?: string; }
interface Vaccination { id: string; vaccineName: string; scheduledDate: string; administeredDate?: string | null; status: string; notes?: string | null; }

function listFrom(response: any): any[] {
  const body = response?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.livestock)) return body.livestock;
  return [];
}

export default function LivestockVaccinationsPage() {
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const canWrite = canCreate('livestock');
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalId, setAnimalId] = useState('');
  const [records, setRecords] = useState<Vaccination[]>([]);
  const [vaccineName, setVaccineName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const response = await livestockHealthAPI.listVaccinations(animalId);
      setRecords(listFrom(response));
    } catch (error: any) {
      toast({ type: 'error', title: 'Failed to load vaccination schedules', message: error.response?.data?.message || 'Could not load vaccination schedules.' });
    }
  }, [animalId, toast]);

  useEffect(() => { void loadAnimals(); }, [loadAnimals]);
  useEffect(() => { void loadRecords(); }, [loadRecords]);

  async function schedule(event: React.FormEvent) {
    event.preventDefault();
    if (!animalId || !vaccineName.trim() || !scheduledDate) {
      toast({ type: 'error', title: 'Required information missing', message: 'Choose an animal, vaccine, and date.' });
      return;
    }
    setSaving(true);
    try {
      await livestockHealthAPI.scheduleVaccination(animalId, { vaccineName: vaccineName.trim(), scheduledDate });
      setVaccineName('');
      toast({ type: 'success', title: 'Vaccination scheduled' });
      await loadRecords();
    } catch (error: any) {
      toast({ type: 'error', title: 'Failed to schedule vaccination', message: error.response?.data?.message || 'Could not save the schedule.' });
    } finally {
      setSaving(false);
    }
  }

  async function markAdministered(id: string) {
    try {
      await livestockHealthAPI.administerVaccination(id);
      toast({ type: 'success', title: 'Vaccination recorded as administered' });
      await loadRecords();
    } catch (error: any) {
      toast({ type: 'error', title: 'Could not update vaccination', message: error.response?.data?.message || 'Please try again.' });
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
      <h1 className="text-2xl font-bold">Livestock Vaccinations</h1>
      <Card>
        <CardContent className="pt-6">
          <label className="block text-sm font-medium">Animal
            <select className="mt-1 w-full rounded-md border bg-background p-2" value={animalId} onChange={(event) => setAnimalId(event.target.value)} disabled={loading}>
              {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.species}{animal.breed ? ` · ${animal.breed}` : ''}</option>)}
            </select>
          </label>
        </CardContent>
      </Card>
      {canWrite && (
        <Card>
          <CardHeader><CardTitle>Schedule vaccination</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={schedule} className="grid gap-4 sm:grid-cols-3">
              <Input value={vaccineName} onChange={(event) => setVaccineName(event.target.value)} placeholder="Vaccine name" required />
              <Input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} required />
              <Button type="submit" loading={saving} disabled={saving || !animalId}>Schedule</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Vaccination history</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading schedules…</p> : records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vaccinations for this animal.</p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="font-medium">{record.vaccineName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.scheduledDate).toLocaleDateString()}
                      {record.administeredDate ? ` · Administered ${new Date(record.administeredDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={['ADMINISTERED', 'ADMINISTERD'].includes(record.status) ? 'success' : 'secondary'}>{record.status}</Badge>
                    {canWrite && record.status === 'SCHEDULED' && (
                      <Button size="sm" variant="outline" onClick={() => void markAdministered(record.id)}>Mark administered</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
