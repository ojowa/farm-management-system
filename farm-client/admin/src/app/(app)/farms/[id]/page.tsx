'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Ruler,
  Pencil,
  Plus,
  Trash2,
  Archive,
  RotateCcw,
  Sprout,
  Beef,
  Egg,
  Fish,
  Home,
  Tractor,
  AlertCircle,
  Users,
  ChevronRight,
  Layers,
} from 'lucide-react';
import {
  farmsAPI,
  fieldsAPI,
  cropsAPI,
  livestockAPI,
  aquacultureAPI,
  poultryAPI,
  poultryHousesAPI,
  workersAPI,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { clearFarmCaches } from '@/lib/farmCaches';
import { fieldFormSchema } from '@/lib/validation';
import { usePermission } from '@/lib/usePermission';
import { RecordTasksCard } from '@/components/RecordTasksCard';

import { FARM_TYPE_MAP as FARM_TYPE_CONFIG } from '@/lib/farmTypes';

interface Farm {
  id: string;
  name: string;
  farmType: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  size?: number;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Field {
  id: string;
  name: string;
  size?: number;
}

interface PoultryHouse {
  id: string;
  name: string;
  farmId: string;
  capacity?: number;
  status?: string;
}

/**
 * Related-module cards keyed by the plan module that backs each farm type.
 * `href` is explicit — the crop module lives at `/crops` (plural), so building
 * the link as `/${module}` used to 404 on the Crops card.
 */
const RELATED_MODULES: Record<
  string,
  { label: string; description: string; icon: typeof Sprout; color: string; href: string }
> = {
  crop: { label: 'Crops', description: 'View crop cycles', icon: Sprout, color: 'text-green-600', href: '/crops' },
  livestock: { label: 'Livestock', description: 'View livestock', icon: Beef, color: 'text-amber-600', href: '/livestock' },
  poultry: { label: 'Poultry', description: 'View flocks', icon: Egg, color: 'text-orange-600', href: '/poultry' },
  aquaculture: { label: 'Aquaculture', description: 'View ponds & stock', icon: Fish, color: 'text-cyan-600', href: '/aquaculture' },
};

export default function FarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate, canDelete, canRead } = usePermission();
  const readOnly = !canCreate('farm');
  // The Workers tile counts and links into the worker directory (worker.read);
  // hide it for users without it so the fetch doesn't 403 and the link can't
  // bounce to AccessDenied.
  const canReadWorkers = canRead('worker');
  const [showDelete, setShowDelete] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [addFieldForm, setAddFieldForm] = useState({ name: '', size: '' });
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});
  const [addFieldSaving, setAddFieldSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const {
    data: farmData,
    loading,
    error,
    refetch,
  } = useFetch<{ data: Farm }>(`farm-${id}`, () => farmsAPI.get(id), {
    cacheTime: 30_000,
  });

  // The farm service returns the farm entity BARE (the gateway wraps it once
  // and the api client unwraps it), while this page historically read
  // `farmData?.data` — which is undefined for a bare farm, so every loaded
  // farm fell through to "Farm not found". Accept both shapes.
  const farm: Farm | null = ((farmData as any)?.data ?? farmData ?? null);

  // ── Related data for this farm (fired once the farm has loaded) ──────
  const loaded = Boolean(farm);

  const { data: fieldsData, refetch: refetchFields } = useFetch<{ data: Field[] }>(
    `farm-fields-${id}`,
    () => fieldsAPI.list({ farmId: id }),
    { enabled: loaded, cacheTime: 30_000 }
  );

  const { data: cyclesData } = useFetch<{ data: any[]; total?: number }>(
    `farm-cycles-${id}`,
    () => cropsAPI.listCycles({ farmId: id, limit: 5 }),
    { enabled: loaded, cacheTime: 30_000 }
  );

  const { data: livestockStat } = useFetch<{ data: any[]; total?: number }>(
    `farm-stat-livestock-${id}`,
    () => livestockAPI.list({ farmId: id, limit: 1 }),
    { enabled: loaded, cacheTime: 30_000 }
  );

  const { data: pondsStat } = useFetch<{ data: any[]; total?: number }>(
    `farm-stat-ponds-${id}`,
    () => aquacultureAPI.ponds.list({ farmId: id, limit: 1 }),
    { enabled: loaded, cacheTime: 30_000 }
  );

  const { data: flocksStat } = useFetch<{ data: any[]; total?: number }>(
    `farm-stat-flocks-${id}`,
    () => poultryAPI.list({ farmId: id, limit: 1 }),
    { enabled: loaded, cacheTime: 30_000 }
  );

  // Houses sit with the fields on this page, so they are scoped to the farm
  // here rather than loaded wholesale from the houses list.
  const { data: housesData } = useFetch<{ data: PoultryHouse[]; total?: number }>(
    `farm-houses-${id}`,
    () => poultryHousesAPI.list({ farmId: id, limit: 1000 }),
    { enabled: loaded, cacheTime: 30_000 }
  );

  const { data: workersStat } = useFetch<{ data: any[]; total?: number }>(
    `farm-stat-workers-${id}`,
    () => workersAPI.list({ farmId: id, limit: 1 }),
    { enabled: loaded && canReadWorkers, cacheTime: 30_000 }
  );

  const fields: Field[] = fieldsData?.data || [];
  const recentCycles: any[] = (cyclesData?.data || []).slice(0, 5);
  const houses: PoultryHouse[] = housesData?.data || [];
  // Long enough to be useful, short enough to keep the card the same height
  // as its neighbours — the header's count and "View all" cover the rest.
  const visibleHouses = houses.slice(0, 8);

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) {
        refetch();
      }
    },
    [id, refetch]
  );
  useRealtime('farm', handleRealtimeEvent);

  const handleDelete = async () => {
    if (!farm) return;
    setActionLoading(true);
    try {
      await farmsAPI.delete(id);
      toast({ type: 'success', title: 'Farm deleted' });
      clearFarmCaches();
      router.push('/farms');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete farm',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setActionLoading(false);
      setShowDelete(false);
    }
  };

  const handleAddFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = fieldFormSchema.safeParse({ ...addFieldForm, farmId: id });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errs[String(issue.path[0])] = issue.message;
      });
      setAddFieldErrors(errs);
      return;
    }
    setAddFieldErrors({});
    setAddFieldSaving(true);
    try {
      await fieldsAPI.create({ farmId: id, name: addFieldForm.name.trim(), size: Number(addFieldForm.size) });
      toast({ type: 'success', title: 'Field added' });
      setShowAddField(false);
      setAddFieldForm({ name: '', size: '' });
      clearFetchCache('farm-fields');
      clearFetchCache('crop-new-fields');
      refetchFields();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to add field', message: err.response?.data?.message || 'An error occurred' });
    } finally {
      setAddFieldSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!farm) return;
    const nextStatus = farm.status === 'inactive' ? 'active' : 'inactive';
    setActionLoading(true);
    try {
      await farmsAPI.update(id, { status: nextStatus });
      toast({
        type: 'success',
        title: nextStatus === 'inactive' ? 'Farm archived' : 'Farm restored',
      });
      clearFarmCaches();
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: `Failed to ${nextStatus === 'inactive' ? 'archive' : 'restore'} farm`,
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setActionLoading(false);
      setShowArchive(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  // A genuine 404 (stale link or a farm deleted elsewhere) gets the friendly
  // not-found card; anything else keeps the retry affordance.
  const notFound = (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Farm not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => router.push('/farms')}>
        Back to Farms
      </Button>
    </div>
  );

  if (error && !farm) {
    if (/not found/i.test(error)) return notFound;
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-lg font-medium text-destructive">Failed to load farm</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!farm) return notFound;

  const typeConfig = FARM_TYPE_CONFIG[farm.farmType];
  const TypeIcon = typeConfig?.icon || Tractor;
  const hasCoordinates = farm.latitude != null && farm.longitude != null;
  // Related data leads with the farm type's backing module — an aquaculture
  // farm gets the Aquaculture module, a dairy farm livestock, and so on —
  // then the remaining modules so every record stays reachable.
  const relatedModule = typeConfig?.module || null;
  const related = [
    ...(relatedModule && RELATED_MODULES[relatedModule] ? [relatedModule] : []),
    ...Object.keys(RELATED_MODULES).filter((m) => m !== relatedModule),
  ];

  // Live per-module counts for this farm — each tile links to the target
  // list pre-filtered with ?farmId=. A count the viewer's role can't read
  // (or that hasn't loaded yet) renders as an em dash. The Workers tile is
  // omitted entirely without worker.read: it would link into the directory
  // the route guard would bounce them from.
  const statTiles = [
    { label: 'Crop Cycles', count: cyclesData?.total, href: `/crops?farmId=${id}`, icon: Sprout, bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' },
    { label: 'Livestock', count: livestockStat?.total, href: `/livestock?farmId=${id}`, icon: Beef, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Ponds', count: pondsStat?.total, href: `/aquaculture?farmId=${id}`, icon: Fish, bg: 'bg-cyan-100 dark:bg-cyan-900/30', color: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Flocks', count: flocksStat?.total, href: `/poultry?farmId=${id}`, icon: Egg, bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-600 dark:text-orange-400' },
    ...(canReadWorkers
      ? [{ label: 'Workers', count: workersStat?.total, href: `/workers?farmId=${id}`, icon: Users, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' }]
      : []),
  ];

  // Mirrors the crop list's status-badge convention (completed → success,
  // failed → destructive, everything else — including legacy 'growing' —
  // secondary), so the two screens agree on what a status looks like.
  const cycleStatusBadge = (status?: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'COMPLETED') return <Badge variant="success">Completed</Badge>;
    if (s === 'FAILED') return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">{status || 'growing'}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/farms"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Farms
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{farm.name}</h1>
              {typeConfig && (
                <Badge className={typeConfig.color}>
                  <TypeIcon className="mr-1 h-3 w-3" />
                  {typeConfig.label}
                </Badge>
              )}
            </div>
            {farm.location && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                {farm.location}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={farm.status === 'inactive' ? 'secondary' : 'success'}>
              {farm.status === 'inactive' ? 'Inactive' : 'Active'}
            </Badge>
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/farms/${id}/edit`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={() => setShowArchive(true)}>
                  {farm.status === 'inactive' ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </>
                  )}
                </Button>
              </>
            )}
            {canDelete('farm') && (
              <Button variant="destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Ruler className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="text-lg font-semibold">
                  {farm.size ? `${farm.size} acres` : 'Not set'}
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
                  {new Date(farm.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="text-lg font-semibold">{farm.location || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Farm at a glance — live counts, each tile linking to the list
          pre-filtered to this farm (?farmId=). */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statTiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <div className="flex items-center gap-3 rounded-lg border p-4 transition-colors cursor-pointer hover:bg-muted/50">
              <div className={`p-2 rounded-lg ${tile.bg}`}>
                <tile.icon className={`h-5 w-5 ${tile.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold">{tile.count ?? '—'}</p>
                <p className="text-sm text-muted-foreground truncate">{tile.label}</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>

      {/* Coordinates */}
      {hasCoordinates && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <MapPin className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coordinates</p>
                <p className="text-lg font-semibold font-mono">
                  {farm.latitude!.toFixed(4)}, {farm.longitude!.toFixed(4)}
                </p>
              </div>
              <Button
                variant="link"
                className="ml-auto"
                onClick={() =>
                  window.open(
                    `https://www.openstreetmap.org/?mlat=${farm.latitude}&mlon=${farm.longitude}#map=15/${farm.latitude}/${farm.longitude}`,
                    '_blank'
                  )
                }
              >
                View on map
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fields, latest crop cycles and this farm's poultry houses — three
          cards side by side, each one scoped to the farm in the route. */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Fields ({fields.length})
            </CardTitle>
            {!readOnly && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowAddField(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Field
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No fields recorded for this farm yet.
              </p>
            ) : (
              <ul className="divide-y">
                {fields.map((field) => (
                  <li key={field.id} className="flex items-center justify-between gap-3 py-2">
                    {/* Parcels have their own record page (tasks link to it). */}
                    <Link
                      href={`/fields/${field.id}`}
                      className="font-medium truncate hover:underline"
                    >
                      {field.name}
                    </Link>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {field.size != null ? `${field.size} acres` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sprout className="h-5 w-5 text-green-600" />
              Recent Crop Cycles
            </CardTitle>
            <Button variant="link" size="sm" onClick={() => router.push(`/crops?farmId=${id}`)}>
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentCycles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No crop cycles yet for this farm.
              </p>
            ) : (
              <ul className="divide-y">
                {recentCycles.map((cycle) => (
                  <li key={cycle.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{cycle.cropName || 'Unknown crop'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {cycle.fieldName ? `${cycle.fieldName} · ` : ''}
                        Planted{' '}
                        {cycle.plantingDate
                          ? new Date(cycle.plantingDate).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>
                    {cycleStatusBadge(cycle.status)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5 text-orange-600" />
              Poultry Houses ({houses.length})
            </CardTitle>
            <Button variant="link" size="sm" onClick={() => router.push('/poultry/houses')}>
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {houses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No poultry houses on this farm yet.
              </p>
            ) : (
              <ul className="divide-y">
                {visibleHouses.map((house) => (
                  <li key={house.id} className="flex items-center justify-between gap-3 py-2">
                    <Link
                      href={`/poultry/houses/${house.id}`}
                      className="font-medium truncate hover:underline"
                    >
                      {house.name}
                    </Link>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {house.capacity != null
                        ? `Capacity ${house.capacity.toLocaleString()}`
                        : '—'}
                    </span>
                  </li>
                ))}
                {houses.length > visibleHouses.length && (
                  <li className="py-2 text-sm text-muted-foreground">
                    +{houses.length - visibleHouses.length} more — see View all
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links — driven by the farm type's backing module */}
      <Card>
        <CardHeader>
          <CardTitle>Related Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {related.map((module, index) => {
              const config = RELATED_MODULES[module];
              return (
                <Link key={module} href={`${config.href}?farmId=${id}`}>
                  <div
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                      index === 0 ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                  >
                    <config.icon className={`h-5 w-5 ${config.color}`} />
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDelete}
        title="Delete farm"
        message={`Delete "${farm.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      {/* Inline Add Field modal */}
      <Dialog open={showAddField} onOpenChange={setShowAddField} title="Add Field">
        <form onSubmit={handleAddFieldSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Field Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. North Valley Plot"
              value={addFieldForm.name}
              onChange={(e) => setAddFieldForm({ ...addFieldForm, name: e.target.value })}
            />
            {addFieldErrors.name && <p className="text-sm text-destructive mt-1">{addFieldErrors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Size</label>
            <Input
              type="number"
              placeholder="Size in acres"
              value={addFieldForm.size}
              onChange={(e) => setAddFieldForm({ ...addFieldForm, size: e.target.value })}
            />
            {addFieldErrors.size && <p className="text-sm text-destructive mt-1">{addFieldErrors.size}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowAddField(false); setAddFieldForm({ name: '', size: '' }); }}>
              Cancel
            </Button>
            <Button type="submit" loading={addFieldSaving}>Add Field</Button>
          </div>
        </form>
      </Dialog>

      {/* Archive/Restore confirmation */}
      <ConfirmDialog
        open={showArchive}
        title={farm.status === 'inactive' ? 'Restore farm' : 'Archive farm'}
        message={
          farm.status === 'inactive'
            ? `Restore "${farm.name}"? It will appear as active again.`
            : `Archive "${farm.name}"? It will be marked inactive.`
        }
        confirmLabel={farm.status === 'inactive' ? 'Restore' : 'Archive'}
        loading={actionLoading}
        onConfirm={handleArchiveToggle}
        onCancel={() => setShowArchive(false)}
      />

      {/* People: tasks raised against this farm + its worker headcount. */}
      <RecordTasksCard moduleKey="farm" recordId={id} recordName={farm.name} farmId={id} />
    </div>
  );
}
