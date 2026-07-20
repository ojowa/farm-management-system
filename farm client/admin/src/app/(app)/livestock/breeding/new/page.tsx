'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { breedingAPI, livestockAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { useToast } from '@/lib/toasts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Heart, ArrowLeft } from 'lucide-react';

export default function NewBreedingRecordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [sireId, setSireId] = useState('');
  const [damId, setDamId] = useState('');
  const [breedingDate, setBreedingDate] = useState('');
  const [expectedDueDate, setExpectedDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const { data: livestockData, loading: isLoadingLivestock } = useFetch<{ data: any[] }>(
    'livestock-list-for-breeding',
    useCallback(async () => await livestockAPI.list({ limit: 200 }), [])
  );

  const livestock = livestockData?.data || [];
  const livestockOptions = livestock.map((l: any) => ({ value: l.id, label: `${l.name} (${l.species})` }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sireId || !damId || !breedingDate || !expectedDueDate) {
      toast({ type: 'warning', title: 'Please fill in all required fields' });
      return;
    }
    if (sireId === damId) {
      toast({ type: 'error', title: 'Sire and Dam must be different animals' });
      return;
    }
    setSubmitting(true);
    try {
      await breedingAPI.create({ sireId, damId, breedingDate, expectedDueDate, notes });
      toast({ type: 'success', title: 'Breeding record created successfully' });
      router.push('/livestock/breeding');
    } catch (err: any) {
      toast({ type: 'error', title: err.response?.data?.message || 'Failed to create breeding record' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">New Breeding Record</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breeding Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLivestock ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sire (Male) *</label>
                  <Select
                    value={sireId}
                    onChange={(e) => setSireId(e.target.value)}
                    options={livestockOptions}
                    placeholder="Select sire"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dam (Female) *</label>
                  <Select
                    value={damId}
                    onChange={(e) => setDamId(e.target.value)}
                    options={livestockOptions}
                    placeholder="Select dam"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Breeding Date *</label>
                  <Input
                    type="date"
                    value={breedingDate}
                    onChange={(e) => setBreedingDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expected Due Date *</label>
                  <Input
                    type="date"
                    value={expectedDueDate}
                    onChange={(e) => setExpectedDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
                  placeholder="Optional notes about this breeding"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Breeding Record'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
