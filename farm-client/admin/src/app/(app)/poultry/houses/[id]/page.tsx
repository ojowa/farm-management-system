'use client';

import React, { useCallback, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Home,
  Calendar,
  Plus,
  Users,
  Pencil,
  Trash2,
} from 'lucide-react';
import { poultryHousesAPI, pensAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Dialog } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { usePermission } from '@/lib/usePermission';
import { RecordTasksCard } from '@/components/RecordTasksCard';
import { penFormSchema } from '@/lib/validation';

interface PoultryHouse {
  id: string;
  name: string;
  farmId: string;
  farmName?: string;
  capacity?: number;
  status?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Pen {
  id: string;
  poultryHouseId: string;
  name: string;
  capacity: number;
}

export default function PoultryHouseDetailPage() {
  const { canCreate, canUpdate, canDelete } = usePermission();
  const readOnly = !canCreate('poultry');
  const canEditPen = canUpdate('poultry');
  const canRemovePen = canDelete('poultry');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const {
    data: houseData,
    loading,
    refetch,
  } = useFetch<{ data: PoultryHouse }>(`poultry-house-${id}`, () => poultryHousesAPI.get(id), {
    cacheTime: 30_000,
  });

  // Pens live under this house, so they are scoped by `poultryHouseId` rather
  // than loaded wholesale — this page only ever manages its own house's pens.
  const {
    data: pensData,
    loading: pensLoading,
    refetch: refetchPens,
  } = useFetch<{ data: Pen[] }>(`poultry-house-pens-${id}`, () =>
    pensAPI.list({ poultryHouseId: id, limit: 1000 })
  );
  const pens: Pen[] = (pensData as any)?.data ?? (Array.isArray(pensData) ? pensData : []);

  const [showPenForm, setShowPenForm] = useState(false);
  const [editingPenId, setEditingPenId] = useState<string | null>(null);
  const [penForm, setPenForm] = useState({ name: '', capacity: '' });
  const [penFormErrors, setPenFormErrors] = useState<Record<string, string>>({});
  const [penSaving, setPenSaving] = useState(false);

  const resetPenForm = () => {
    setPenForm({ name: '', capacity: '' });
    setPenFormErrors({});
  };

  const openAddPen = () => {
    setEditingPenId(null);
    resetPenForm();
    setShowPenForm(true);
  };

  const openEditPen = (pen: Pen) => {
    setEditingPenId(pen.id);
    resetPenForm();
    setPenForm({ name: pen.name, capacity: String(pen.capacity ?? '') });
    setShowPenForm(true);
  };

  const dropPenCaches = () => {
    clearFetchCache('poultry-house-pens-');
    // The flock forms cache their own pen lists, keyed by farm.
    clearFetchCache('poultry-flock-pens');
  };

  const handleSavePen = async (event: React.FormEvent) => {
    event.preventDefault();
    // The house is this page's route param, so it is fixed rather than picked.
    const result = penFormSchema.safeParse({ ...penForm, poultryHouseId: id });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setPenFormErrors(errors);
      return;
    }
    setPenFormErrors({});
    setPenSaving(true);
    try {
      const payload = { name: penForm.name.trim(), capacity: Number(penForm.capacity) };
      if (editingPenId) {
        await pensAPI.update(editingPenId, payload);
        toast({ type: 'success', title: 'Pen updated' });
      } else {
        await pensAPI.create({ poultryHouseId: id, ...payload });
        toast({ type: 'success', title: 'Pen created' });
      }
      setShowPenForm(false);
      dropPenCaches();
      refetchPens();
    } catch (err: any) {
      toast({
        type: 'error',
        title: editingPenId ? 'Failed to update pen' : 'Failed to create pen',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setPenSaving(false);
    }
  };

  const handleDeletePen = async (pen: Pen) => {
    if (!confirm(`Delete pen "${pen.name}"? Flocks assigned to it must be moved first.`)) return;
    try {
      await pensAPI.delete(pen.id);
      toast({ type: 'success', title: 'Pen deleted' });
      dropPenCaches();
      refetchPens();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete pen',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  // The service returns the house bare; accept `{ data }` too so a loaded
  // house never falls through to the "not found" state.
  const house = ((houseData as any)?.data ?? houseData ?? null);

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  useRealtime('poultryHouse', handleRealtimeEvent);

  const handleDelete = async () => {
    if (!house || !confirm(`Delete "${house.name}"? This action cannot be undone.`))
      return;
    try {
      await poultryHousesAPI.delete(id);
      toast({ type: 'success', title: 'Poultry house deleted' });
      clearFetchCache('poultry-houses');
      router.push('/poultry/houses');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete poultry house',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!house) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Poultry house not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/poultry/houses')}>
          Back to Houses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/poultry/houses"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Poultry Houses
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{house.name}</h1>
            {house.farmName && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Home className="h-4 w-4" />
                {house.farmName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={house.status === 'active' ? 'success' : 'secondary'}>
              {house.status || 'active'}
            </Badge>
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/poultry/houses/${id}/edit`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="text-lg font-semibold">
                  {house.capacity ? `${house.capacity} birds` : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-lg font-semibold">
                  {new Date(house.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Home className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold capitalize">{house.status || 'active'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>
            Pens
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({pens.length})
            </span>
          </CardTitle>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={openAddPen}>
              <Plus className="mr-2 h-4 w-4" />
              Add Pen
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {pensLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner className="h-6 w-6" />
            </div>
          ) : pens.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                This house has no pens yet. Pens are what flocks are assigned to.
              </p>
              {!readOnly && (
                <Button variant="outline" size="sm" className="mt-4" onClick={openAddPen}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add the first pen
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pen</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pens.map((pen) => (
                    <TableRow key={pen.id}>
                      <TableCell>
                        <span className="font-medium">{pen.name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pen.capacity != null ? `${pen.capacity.toLocaleString()} birds` : '—'}
                      </TableCell>
                      <TableCell>
                        {!readOnly && (
                          <div className="flex items-center gap-1">
                            {canEditPen && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPen(pen)}
                                aria-label={`Edit ${pen.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canRemovePen && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void handleDeletePen(pen)}
                                aria-label={`Delete ${pen.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!readOnly && (
        <Dialog
          open={showPenForm}
          onOpenChange={(open) => {
            setShowPenForm(open);
            if (!open) resetPenForm();
          }}
          title={editingPenId ? 'Edit Pen' : `Add Pen — ${house.name}`}
        >
          <form onSubmit={handleSavePen} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Pen Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Pen A"
                value={penForm.name}
                onChange={(event) => setPenForm({ ...penForm, name: event.target.value })}
              />
              {penFormErrors.name && (
                <p className="mt-1 text-sm text-destructive">{penFormErrors.name}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Capacity (birds) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                placeholder="1000"
                value={penForm.capacity}
                onChange={(event) => setPenForm({ ...penForm, capacity: event.target.value })}
              />
              {penFormErrors.capacity && (
                <p className="mt-1 text-sm text-destructive">{penFormErrors.capacity}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPenForm(false);
                  resetPenForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={penSaving}>
                {editingPenId ? 'Save Pen' : 'Create Pen'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {house.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{house.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Related Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Link href={`/poultry/flocks?houseId=${id}`}>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Users className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Flocks</p>
                  <p className="text-sm text-muted-foreground">View flocks in this house</p>
                </div>
              </div>
            </Link>
            <Link href={`/poultry/feeding?houseId=${id}`}>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Home className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Feeding Records</p>
                  <p className="text-sm text-muted-foreground">View feeding history</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Tasks raised against this house. */}
      <RecordTasksCard moduleKey="poultry" recordId={id} recordName={house?.name} />
    </div>
  );
}