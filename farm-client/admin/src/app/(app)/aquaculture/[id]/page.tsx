'use client';

import React, { useCallback, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Fish,
  Calendar,
  Ruler,
  Droplets,
  Users,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { aquacultureAPI, farmsAPI } from '@/lib/api';
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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import {
  pondFormSchema,
  pondStockingFormSchema,
  pondFeedingFormSchema,
  pondWaterQualityFormSchema,
  pondHarvestFormSchema,
} from '@/lib/validation';
import { usePermission } from '@/lib/usePermission';

interface Pond {
  id: string;
  organizationId: string;
  farmId: string;
  name: string;
  pondType: string;
  area: number | null;
  waterSource: string | null;
  capacity: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PondStocking {
  id: string;
  organizationId: string;
  pondId: string;
  species: string;
  strain: string | null;
  count: number;
  source: string | null;
  totalCost: number | null;
  stockedAt: string;
  expectedHarvestAt: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PondFeeding {
  id: string;
  organizationId: string;
  pondId: string;
  stockingId: string | null;
  feedType: string;
  quantityKg: number;
  cost: number | null;
  fedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PondWaterQuality {
  id: string;
  organizationId: string;
  pondId: string;
  ph: number | null;
  temperatureC: number | null;
  dissolvedOxygen: number | null;
  ammonia: number | null;
  turbidity: number | null;
  recordedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PondHarvest {
  id: string;
  organizationId: string;
  pondId: string;
  stockingId: string | null;
  quantityKg: number;
  count: number | null;
  unitPrice: number | null;
  revenue: number | null;
  harvestedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Farm {
  id: string;
  name: string;
}

const EMPTY_POND_FORM = {
  name: '',
  farmId: '',
  pondType: 'FISH',
  area: '',
  waterSource: '',
  capacity: '',
  status: 'active',
  notes: '',
};

const EMPTY_STOCKING_FORM = {
  species: '',
  strain: '',
  count: '',
  source: '',
  totalCost: '',
  stockedAt: '',
  expectedHarvestAt: '',
  status: 'ongoing',
  notes: '',
};

const EMPTY_FEEDING_FORM = {
  feedType: '',
  quantityKg: '',
  cost: '',
  fedAt: '',
  notes: '',
};

const EMPTY_WATER_QUALITY_FORM = {
  recordedAt: '',
  ph: '',
  temperatureC: '',
  dissolvedOxygen: '',
  ammonia: '',
  turbidity: '',
  notes: '',
};

const EMPTY_HARVEST_FORM = {
  harvestedAt: '',
  quantityKg: '',
  count: '',
  unitPrice: '',
  revenue: '',
  notes: '',
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active':
    case 'ongoing':
      return 'success';
    case 'draining':
      return 'warning';
    case 'maintenance':
    case 'completed':
      return 'secondary';
    case 'retired':
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function PondDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('aquaculture');

  const [showEdit, setShowEdit] = useState(false);
  const [pondForm, setPondForm] = useState(EMPTY_POND_FORM);
  const [pondFormErrors, setPondFormErrors] = useState<Record<string, string>>({});
  const [savingPond, setSavingPond] = useState(false);

  const [showAddStocking, setShowAddStocking] = useState(false);
  const [editingStocking, setEditingStocking] = useState<PondStocking | null>(null);
  const [stockingForm, setStockingForm] = useState(EMPTY_STOCKING_FORM);
  const [stockingFormErrors, setStockingFormErrors] = useState<Record<string, string>>({});
  const [savingStocking, setSavingStocking] = useState(false);

  const [showAddFeeding, setShowAddFeeding] = useState(false);
  const [feedingForm, setFeedingForm] = useState(EMPTY_FEEDING_FORM);
  const [feedingFormErrors, setFeedingFormErrors] = useState<Record<string, string>>({});
  const [savingFeeding, setSavingFeeding] = useState(false);

  const [showAddWaterQuality, setShowAddWaterQuality] = useState(false);
  const [waterQualityForm, setWaterQualityForm] = useState(EMPTY_WATER_QUALITY_FORM);
  const [waterQualityFormErrors, setWaterQualityFormErrors] = useState<Record<string, string>>({});
  const [savingWaterQuality, setSavingWaterQuality] = useState(false);

  const [showAddHarvest, setShowAddHarvest] = useState(false);
  const [harvestForm, setHarvestForm] = useState(EMPTY_HARVEST_FORM);
  const [harvestFormErrors, setHarvestFormErrors] = useState<Record<string, string>>({});
  const [savingHarvest, setSavingHarvest] = useState(false);

  const {
    data: pondData,
    loading,
    refetch,
  } = useFetch<{ data: Pond }>(`aquaculture-pond-${id}`, () => aquacultureAPI.ponds.get(id), {
    cacheTime: 30_000,
  });

  const { data: stockingsData, refetch: refetchStockings } = useFetch<{ data: PondStocking[] }>(
    `aquaculture-stockings-${id}`,
    () => aquacultureAPI.stockings.listByPond(id),
    { cacheTime: 30_000 }
  );

  const { data: feedingsData, refetch: refetchFeedings } = useFetch<{ data: PondFeeding[] }>(
    `aquaculture-feedings-${id}`,
    () => aquacultureAPI.feedings.listByPond(id),
    { cacheTime: 30_000 }
  );

  const { data: waterQualityData, refetch: refetchWaterQuality } = useFetch<{ data: PondWaterQuality[] }>(
    `aquaculture-water-quality-${id}`,
    () => aquacultureAPI.waterQuality.listByPond(id),
    { cacheTime: 30_000 }
  );

  const { data: harvestsData, refetch: refetchHarvests } = useFetch<{ data: PondHarvest[] }>(
    `aquaculture-harvests-${id}`,
    () => aquacultureAPI.harvests.listByPond(id),
    { cacheTime: 30_000 }
  );

  const { data: farmsData } = useFetch<{ data: Farm[] }>(
    'farms-dropdown',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  // The service returns the pond bare; accept `{ data }` too so a loaded
  // pond never falls through to the "not found" state.
  const pond = ((pondData as any)?.data ?? pondData ?? null);
  const stockings = stockingsData?.data || [];
  const feedings = feedingsData?.data || [];
  const waterQuality = waterQualityData?.data || [];
  const harvests = harvestsData?.data || [];
  const farms = farmsData?.data || [];
  const farm = farms.find((f) => f.id === pond?.farmId);

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id || event.data?.pondId === id) {
        refetch();
        refetchStockings();
        refetchFeedings();
        refetchWaterQuality();
        refetchHarvests();
      }
    },
    [id, refetch, refetchStockings, refetchFeedings, refetchWaterQuality, refetchHarvests]
  );
  useRealtime('aquaculture', handleRealtimeEvent);

  const handleDelete = async () => {
    if (!pond || !confirm(`Delete "${pond.name}"? This will also delete all of its stockings, feedings, water quality records and harvests. This action cannot be undone.`))
      return;
    try {
      await aquacultureAPI.ponds.delete(id);
      toast({ type: 'success', title: 'Pond deleted' });
      clearFetchCache('aquaculture');
      router.push('/aquaculture');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete pond',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const openEditPond = () => {
    if (!pond) return;
    setPondForm({
      name: pond.name,
      farmId: pond.farmId,
      pondType: pond.pondType || 'FISH',
      area: pond.area != null ? String(pond.area) : '',
      waterSource: pond.waterSource || '',
      capacity: pond.capacity != null ? String(pond.capacity) : '',
      status: pond.status || 'active',
      notes: pond.notes || '',
    });
    setPondFormErrors({});
    setShowEdit(true);
  };

  const handleEditPond = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = pondFormSchema.safeParse(pondForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      setPondFormErrors(errors);
      return;
    }
    setPondFormErrors({});
    setSavingPond(true);
    try {
      await aquacultureAPI.ponds.update(id, {
        name: pondForm.name,
        farmId: pondForm.farmId,
        pondType: pondForm.pondType || undefined,
        area: pondForm.area ? Number(pondForm.area) : undefined,
        waterSource: pondForm.waterSource || undefined,
        capacity: pondForm.capacity ? Number(pondForm.capacity) : undefined,
        status: pondForm.status || undefined,
        notes: pondForm.notes || undefined,
      });
      toast({ type: 'success', title: 'Pond updated successfully' });
      setShowEdit(false);
      clearFetchCache('aquaculture');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update pond',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSavingPond(false);
    }
  };

  const openAddStocking = () => {
    setStockingForm(EMPTY_STOCKING_FORM);
    setStockingFormErrors({});
    setEditingStocking(null);
    setShowAddStocking(true);
  };

  const openEditStocking = (stocking: PondStocking) => {
    setStockingForm({
      species: stocking.species,
      strain: stocking.strain || '',
      count: String(stocking.count),
      source: stocking.source || '',
      totalCost: stocking.totalCost != null ? String(stocking.totalCost) : '',
      stockedAt: stocking.stockedAt ? stocking.stockedAt.substring(0, 10) : '',
      expectedHarvestAt: stocking.expectedHarvestAt
        ? stocking.expectedHarvestAt.substring(0, 10)
        : '',
      status: stocking.status || 'ongoing',
      notes: stocking.notes || '',
    });
    setStockingFormErrors({});
    setEditingStocking(stocking);
    setShowAddStocking(true);
  };

  const handleStockingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = pondStockingFormSchema.safeParse(stockingForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      setStockingFormErrors(errors);
      return;
    }
    setStockingFormErrors({});
    setSavingStocking(true);
    try {
      const payload = {
        species: stockingForm.species,
        strain: stockingForm.strain || undefined,
        count: Number(stockingForm.count),
        source: stockingForm.source || undefined,
        totalCost: stockingForm.totalCost ? Number(stockingForm.totalCost) : undefined,
        stockedAt: stockingForm.stockedAt,
        expectedHarvestAt: stockingForm.expectedHarvestAt || undefined,
        status: stockingForm.status || undefined,
        notes: stockingForm.notes || undefined,
      };
      if (editingStocking) {
        await aquacultureAPI.stockings.update(editingStocking.id, payload);
        toast({ type: 'success', title: 'Stocking updated successfully' });
      } else {
        await aquacultureAPI.stockings.create(id, payload);
        toast({ type: 'success', title: 'Stocking added successfully' });
      }
      setShowAddStocking(false);
      setEditingStocking(null);
      setStockingForm(EMPTY_STOCKING_FORM);
      clearFetchCache('aquaculture');
      refetchStockings();
    } catch (err: any) {
      toast({
        type: 'error',
        title: editingStocking ? 'Failed to update stocking' : 'Failed to add stocking',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSavingStocking(false);
    }
  };

  const handleStockingDelete = async (stockingId: string) => {
    if (!confirm('Delete this stocking? This action cannot be undone.')) return;
    try {
      await aquacultureAPI.stockings.delete(stockingId);
      toast({ type: 'success', title: 'Stocking deleted' });
      clearFetchCache('aquaculture');
      refetchStockings();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete stocking',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const handleFeedingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = pondFeedingFormSchema.safeParse(feedingForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      setFeedingFormErrors(errors);
      return;
    }
    setFeedingFormErrors({});
    setSavingFeeding(true);
    try {
      await aquacultureAPI.feedings.create(id, {
        feedType: feedingForm.feedType,
        quantityKg: Number(feedingForm.quantityKg),
        cost: feedingForm.cost ? Number(feedingForm.cost) : undefined,
        fedAt: feedingForm.fedAt,
        notes: feedingForm.notes || undefined,
      });
      toast({ type: 'success', title: 'Feeding record added successfully' });
      setShowAddFeeding(false);
      setFeedingForm(EMPTY_FEEDING_FORM);
      clearFetchCache('aquaculture');
      refetchFeedings();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to add feeding record',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSavingFeeding(false);
    }
  };

  const handleFeedingDelete = async (feedingId: string) => {
    if (!confirm('Delete this feeding record? This action cannot be undone.')) return;
    try {
      await aquacultureAPI.feedings.delete(feedingId);
      toast({ type: 'success', title: 'Feeding record deleted' });
      clearFetchCache('aquaculture');
      refetchFeedings();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete feeding record',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const handleWaterQualitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = pondWaterQualityFormSchema.safeParse(waterQualityForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      setWaterQualityFormErrors(errors);
      return;
    }
    setWaterQualityFormErrors({});
    setSavingWaterQuality(true);
    try {
      await aquacultureAPI.waterQuality.create(id, {
        ph: waterQualityForm.ph ? Number(waterQualityForm.ph) : undefined,
        temperatureC: waterQualityForm.temperatureC
          ? Number(waterQualityForm.temperatureC)
          : undefined,
        dissolvedOxygen: waterQualityForm.dissolvedOxygen
          ? Number(waterQualityForm.dissolvedOxygen)
          : undefined,
        ammonia: waterQualityForm.ammonia ? Number(waterQualityForm.ammonia) : undefined,
        turbidity: waterQualityForm.turbidity ? Number(waterQualityForm.turbidity) : undefined,
        recordedAt: waterQualityForm.recordedAt,
        notes: waterQualityForm.notes || undefined,
      });
      toast({ type: 'success', title: 'Water quality record added successfully' });
      setShowAddWaterQuality(false);
      setWaterQualityForm(EMPTY_WATER_QUALITY_FORM);
      clearFetchCache('aquaculture');
      refetchWaterQuality();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to add water quality record',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSavingWaterQuality(false);
    }
  };

  const handleWaterQualityDelete = async (recordId: string) => {
    if (!confirm('Delete this water quality record? This action cannot be undone.')) return;
    try {
      await aquacultureAPI.waterQuality.delete(recordId);
      toast({ type: 'success', title: 'Water quality record deleted' });
      clearFetchCache('aquaculture');
      refetchWaterQuality();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete water quality record',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  const handleHarvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = pondHarvestFormSchema.safeParse(harvestForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      setHarvestFormErrors(errors);
      return;
    }
    setHarvestFormErrors({});
    setSavingHarvest(true);
    try {
      await aquacultureAPI.harvests.create(id, {
        quantityKg: Number(harvestForm.quantityKg),
        count: harvestForm.count ? Number(harvestForm.count) : undefined,
        unitPrice: harvestForm.unitPrice ? Number(harvestForm.unitPrice) : undefined,
        revenue: harvestForm.revenue ? Number(harvestForm.revenue) : undefined,
        harvestedAt: harvestForm.harvestedAt,
        notes: harvestForm.notes || undefined,
      });
      toast({ type: 'success', title: 'Harvest record added successfully' });
      setShowAddHarvest(false);
      setHarvestForm(EMPTY_HARVEST_FORM);
      clearFetchCache('aquaculture');
      refetchHarvests();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to add harvest record',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSavingHarvest(false);
    }
  };

  const handleHarvestDelete = async (harvestId: string) => {
    if (!confirm('Delete this harvest record? This action cannot be undone.')) return;
    try {
      await aquacultureAPI.harvests.delete(harvestId);
      toast({ type: 'success', title: 'Harvest record deleted' });
      clearFetchCache('aquaculture');
      refetchHarvests();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete harvest record',
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

  if (!pond) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Pond not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/aquaculture')}>
          Back to Aquaculture
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/aquaculture"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Aquaculture
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{pond.name}</h1>
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <Fish className="h-4 w-4" />
              {pond.pondType || 'FISH'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{pond.pondType || 'FISH'}</Badge>
            <Badge variant={getStatusVariant(pond.status)}>
              {pond.status || 'active'}
            </Badge>
            {!readOnly && (
              <>
                <Button variant="outline" onClick={openEditPond}>
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Fish className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Farm</p>
                <p className="text-lg font-semibold">{farm?.name || 'Unknown'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Ruler className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Area</p>
                <p className="text-lg font-semibold">
                  {pond.area != null ? `${pond.area} ha` : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="text-lg font-semibold">
                  {pond.capacity != null ? pond.capacity.toLocaleString() : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Droplets className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Water Source</p>
                <p className="text-lg font-semibold">{pond.waterSource || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{pond.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Farm</p>
              <p className="font-medium">{farm?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pond Type</p>
              <p className="font-medium">{pond.pondType || 'FISH'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{pond.status || 'active'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Area</p>
              <p className="font-medium">
                {pond.area != null ? `${pond.area} ha` : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Water Source</p>
              <p className="font-medium">{pond.waterSource || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Capacity</p>
              <p className="font-medium">
                {pond.capacity != null ? pond.capacity.toLocaleString() : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="font-medium">{pond.notes || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(pond.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Updated</p>
              <p className="font-medium">
                {new Date(pond.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stockings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Stockings</CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={openAddStocking}>
              <Plus className="mr-2 h-4 w-4" />
              Add Stocking
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {stockings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No stockings recorded for this pond yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Species</TableHead>
                    <TableHead>Strain</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Stocked At</TableHead>
                    <TableHead>Expected Harvest</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockings.map((stocking) => (
                    <TableRow key={stocking.id}>
                      <TableCell>
                        <span className="font-medium">{stocking.species}</span>
                      </TableCell>
                      <TableCell>{stocking.strain || '—'}</TableCell>
                      <TableCell>{stocking.count.toLocaleString()}</TableCell>
                      <TableCell>{stocking.source || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(stocking.stockedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {stocking.expectedHarvestAt
                          ? new Date(stocking.expectedHarvestAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(stocking.status)}>
                          {stocking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditStocking(stocking)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleStockingDelete(stocking.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Feedings</CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={() => {
              setFeedingForm(EMPTY_FEEDING_FORM);
              setFeedingFormErrors({});
              setShowAddFeeding(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Feeding
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {feedings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No feeding records for this pond yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feed Type</TableHead>
                    <TableHead>Quantity (kg)</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Fed At</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedings.map((feeding) => (
                    <TableRow key={feeding.id}>
                      <TableCell>
                        <span className="font-medium">{feeding.feedType}</span>
                      </TableCell>
                      <TableCell>{feeding.quantityKg}</TableCell>
                      <TableCell>{feeding.cost ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(feeding.fedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{feeding.notes || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleFeedingDelete(feeding.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Water Quality */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Water Quality</CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={() => {
              setWaterQualityForm(EMPTY_WATER_QUALITY_FORM);
              setWaterQualityFormErrors({});
              setShowAddWaterQuality(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Reading
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {waterQuality.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No water quality readings for this pond yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recorded At</TableHead>
                    <TableHead>pH</TableHead>
                    <TableHead>Temp (°C)</TableHead>
                    <TableHead>Dissolved O₂</TableHead>
                    <TableHead>Ammonia</TableHead>
                    <TableHead>Turbidity</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waterQuality.map((reading) => (
                    <TableRow key={reading.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(reading.recordedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{reading.ph ?? '—'}</TableCell>
                      <TableCell>{reading.temperatureC ?? '—'}</TableCell>
                      <TableCell>{reading.dissolvedOxygen ?? '—'}</TableCell>
                      <TableCell>{reading.ammonia ?? '—'}</TableCell>
                      <TableCell>{reading.turbidity ?? '—'}</TableCell>
                      <TableCell>{reading.notes || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleWaterQualityDelete(reading.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Harvests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Harvests</CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={() => {
              setHarvestForm(EMPTY_HARVEST_FORM);
              setHarvestFormErrors({});
              setShowAddHarvest(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Harvest
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {harvests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No harvest records for this pond yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Harvested At</TableHead>
                    <TableHead>Quantity (kg)</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {harvests.map((harvest) => (
                    <TableRow key={harvest.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(harvest.harvestedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{harvest.quantityKg}</span>
                      </TableCell>
                      <TableCell>{harvest.count ?? '—'}</TableCell>
                      <TableCell>{harvest.unitPrice ?? '—'}</TableCell>
                      <TableCell>{harvest.revenue ?? '—'}</TableCell>
                      <TableCell>{harvest.notes || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleHarvestDelete(harvest.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Pond Dialog */}
      {!readOnly && (
        <Dialog open={showEdit} onOpenChange={setShowEdit} title="Edit Pond">
          <form onSubmit={handleEditPond} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Pond 1, North Hatchery"
                value={pondForm.name}
                onChange={(e) => setPondForm({ ...pondForm, name: e.target.value })}
              />
              {pondFormErrors.name && (
                <p className="text-sm text-destructive mt-1">{pondFormErrors.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Farm <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select a farm"
                options={farms.map((f) => ({ value: f.id, label: f.name }))}
                value={pondForm.farmId}
                onChange={(e) => setPondForm({ ...pondForm, farmId: e.target.value })}
              />
              {pondFormErrors.farmId && (
                <p className="text-sm text-destructive mt-1">{pondFormErrors.farmId}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Pond Type</label>
              <Select
                placeholder="Select pond type"
                options={[
                  { value: 'FISH', label: 'Fish' },
                  { value: 'SHRIMP', label: 'Shrimp' },
                  { value: 'CRAB', label: 'Crab' },
                  { value: 'MIXED', label: 'Mixed' },
                ]}
                value={pondForm.pondType}
                onChange={(e) => setPondForm({ ...pondForm, pondType: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Area (ha)</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 1.5"
                value={pondForm.area}
                onChange={(e) => setPondForm({ ...pondForm, area: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Water Source</label>
              <Input
                placeholder="e.g. River, Borehole"
                value={pondForm.waterSource}
                onChange={(e) => setPondForm({ ...pondForm, waterSource: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Capacity (fish)</label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={pondForm.capacity}
                onChange={(e) => setPondForm({ ...pondForm, capacity: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                placeholder="Select status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'draining', label: 'Draining' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'retired', label: 'Retired' },
                ]}
                value={pondForm.status}
                onChange={(e) => setPondForm({ ...pondForm, status: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any additional details about this pond..."
                value={pondForm.notes}
                onChange={(e) => setPondForm({ ...pondForm, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={savingPond}>
                Save Changes
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Add/Edit Stocking Dialog */}
      {!readOnly && (
        <Dialog
          open={showAddStocking}
          onOpenChange={(open) => {
            setShowAddStocking(open);
            if (!open) setEditingStocking(null);
          }}
          title={editingStocking ? 'Edit Stocking' : 'Add Stocking'}
        >
          <form onSubmit={handleStockingSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Species <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Tilapia, Catfish, Shrimp"
                value={stockingForm.species}
                onChange={(e) => setStockingForm({ ...stockingForm, species: e.target.value })}
              />
              {stockingFormErrors.species && (
                <p className="text-sm text-destructive mt-1">{stockingFormErrors.species}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Strain</label>
              <Input
                placeholder="e.g. GIFT, NILE"
                value={stockingForm.strain}
                onChange={(e) => setStockingForm({ ...stockingForm, strain: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Count <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                placeholder="e.g. 1000"
                value={stockingForm.count}
                onChange={(e) => setStockingForm({ ...stockingForm, count: e.target.value })}
              />
              {stockingFormErrors.count && (
                <p className="text-sm text-destructive mt-1">{stockingFormErrors.count}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Source</label>
              <Input
                placeholder="e.g. Local hatchery"
                value={stockingForm.source}
                onChange={(e) => setStockingForm({ ...stockingForm, source: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Total Cost</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 500"
                value={stockingForm.totalCost}
                onChange={(e) => setStockingForm({ ...stockingForm, totalCost: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Stocked At <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={stockingForm.stockedAt}
                onChange={(e) => setStockingForm({ ...stockingForm, stockedAt: e.target.value })}
              />
              {stockingFormErrors.stockedAt && (
                <p className="text-sm text-destructive mt-1">{stockingFormErrors.stockedAt}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Expected Harvest</label>
              <Input
                type="date"
                value={stockingForm.expectedHarvestAt}
                onChange={(e) =>
                  setStockingForm({ ...stockingForm, expectedHarvestAt: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                placeholder="Select status"
                options={[
                  { value: 'ongoing', label: 'Ongoing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                ]}
                value={stockingForm.status}
                onChange={(e) => setStockingForm({ ...stockingForm, status: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any additional details..."
                value={stockingForm.notes}
                onChange={(e) => setStockingForm({ ...stockingForm, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddStocking(false);
                  setEditingStocking(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={savingStocking}>
                {editingStocking ? 'Save Changes' : 'Add Stocking'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Add Feeding Dialog */}
      {!readOnly && (
        <Dialog
          open={showAddFeeding}
          onOpenChange={setShowAddFeeding}
          title="Add Feeding"
        >
          <form onSubmit={handleFeedingSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Feed Type <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Starter Feed, Pellets"
                value={feedingForm.feedType}
                onChange={(e) => setFeedingForm({ ...feedingForm, feedType: e.target.value })}
              />
              {feedingFormErrors.feedType && (
                <p className="text-sm text-destructive mt-1">{feedingFormErrors.feedType}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Quantity (kg) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 25"
                value={feedingForm.quantityKg}
                onChange={(e) => setFeedingForm({ ...feedingForm, quantityKg: e.target.value })}
              />
              {feedingFormErrors.quantityKg && (
                <p className="text-sm text-destructive mt-1">{feedingFormErrors.quantityKg}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Cost</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 50"
                value={feedingForm.cost}
                onChange={(e) => setFeedingForm({ ...feedingForm, cost: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Fed At <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={feedingForm.fedAt}
                onChange={(e) => setFeedingForm({ ...feedingForm, fedAt: e.target.value })}
              />
              {feedingFormErrors.fedAt && (
                <p className="text-sm text-destructive mt-1">{feedingFormErrors.fedAt}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any additional details..."
                value={feedingForm.notes}
                onChange={(e) => setFeedingForm({ ...feedingForm, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddFeeding(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={savingFeeding}>
                Add Feeding
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Add Water Quality Dialog */}
      {!readOnly && (
        <Dialog
          open={showAddWaterQuality}
          onOpenChange={setShowAddWaterQuality}
          title="Add Water Quality Reading"
        >
          <form onSubmit={handleWaterQualitySubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Recorded At <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={waterQualityForm.recordedAt}
                onChange={(e) =>
                  setWaterQualityForm({ ...waterQualityForm, recordedAt: e.target.value })
                }
              />
              {waterQualityFormErrors.recordedAt && (
                <p className="text-sm text-destructive mt-1">{waterQualityFormErrors.recordedAt}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">pH</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 7.2"
                value={waterQualityForm.ph}
                onChange={(e) => setWaterQualityForm({ ...waterQualityForm, ph: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Temperature (°C)</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 26"
                value={waterQualityForm.temperatureC}
                onChange={(e) =>
                  setWaterQualityForm({ ...waterQualityForm, temperatureC: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Dissolved Oxygen</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 6.5"
                value={waterQualityForm.dissolvedOxygen}
                onChange={(e) =>
                  setWaterQualityForm({ ...waterQualityForm, dissolvedOxygen: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ammonia</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 0.02"
                value={waterQualityForm.ammonia}
                onChange={(e) =>
                  setWaterQualityForm({ ...waterQualityForm, ammonia: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Turbidity</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 30"
                value={waterQualityForm.turbidity}
                onChange={(e) =>
                  setWaterQualityForm({ ...waterQualityForm, turbidity: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any additional details..."
                value={waterQualityForm.notes}
                onChange={(e) =>
                  setWaterQualityForm({ ...waterQualityForm, notes: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddWaterQuality(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={savingWaterQuality}>
                Add Reading
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Add Harvest Dialog */}
      {!readOnly && (
        <Dialog
          open={showAddHarvest}
          onOpenChange={setShowAddHarvest}
          title="Add Harvest"
        >
          <form onSubmit={handleHarvestSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Harvested At <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={harvestForm.harvestedAt}
                onChange={(e) => setHarvestForm({ ...harvestForm, harvestedAt: e.target.value })}
              />
              {harvestFormErrors.harvestedAt && (
                <p className="text-sm text-destructive mt-1">{harvestFormErrors.harvestedAt}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Quantity (kg) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 300"
                value={harvestForm.quantityKg}
                onChange={(e) => setHarvestForm({ ...harvestForm, quantityKg: e.target.value })}
              />
              {harvestFormErrors.quantityKg && (
                <p className="text-sm text-destructive mt-1">{harvestFormErrors.quantityKg}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Count</label>
              <Input
                type="number"
                placeholder="e.g. 1200"
                value={harvestForm.count}
                onChange={(e) => setHarvestForm({ ...harvestForm, count: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Unit Price</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 3.5"
                value={harvestForm.unitPrice}
                onChange={(e) => setHarvestForm({ ...harvestForm, unitPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Revenue</label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 1050"
                value={harvestForm.revenue}
                onChange={(e) => setHarvestForm({ ...harvestForm, revenue: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                placeholder="Any additional details..."
                value={harvestForm.notes}
                onChange={(e) => setHarvestForm({ ...harvestForm, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddHarvest(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={savingHarvest}>
                Add Harvest
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
