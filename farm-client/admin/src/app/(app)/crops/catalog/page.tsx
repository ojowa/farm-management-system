'use client';

import React, { useMemo, useState } from 'react';
import { NavTabs } from '@/components/NavTabs';
import { CROPS_TABS } from '@/lib/cropsTabs';
import { Plus, Search, Pencil, Trash2, Sprout } from 'lucide-react';
import { cropsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { usePermission } from '@/lib/usePermission';
import { cropCatalogFormSchema } from '@/lib/validation';

interface Crop {
  id: string;
  name: string;
}

interface CropCycleRef {
  cropId: string;
}

/**
 * The organisation's crop catalog: every crop name the org can plant, managed
 * in one place (previously the only way to add one was the inline dialog on the
 * cycles page, and there was no way at all to rename or remove one).
 *
 * The catalog is read through the same `crops-catalog` cache the cycle forms
 * use, so a crop added or renamed here shows up in their dropdowns immediately.
 */
export default function CropCatalogPage() {
  const { canCreate, canUpdate, canDelete } = usePermission();
  const readOnly = !canCreate('crop');
  const canEdit = canUpdate('crop');
  const canRemove = canDelete('crop');
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    data: cropsData,
    loading,
    error,
    refetch,
  } = useFetch<{ data: Crop[] }>('crops-catalog', () => cropsAPI.getCatalog(), {
    cacheTime: 60_000,
  });

  // How many cycles plant each crop — purely informational; the server is the
  // authority and answers a delete of an in-use crop with 409.
  const { data: cyclesData } = useFetch<{ data: CropCycleRef[] }>(
    'crop-cycles-usage',
    () => cropsAPI.listCycles({ limit: 500 }),
    { cacheTime: 60_000 }
  );

  const crops: Crop[] = cropsData?.data ?? (Array.isArray(cropsData) ? (cropsData as Crop[]) : []);

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    const cycles: CropCycleRef[] = cyclesData?.data ?? [];
    cycles.forEach((cycle) => {
      if (!cycle?.cropId) return;
      counts.set(cycle.cropId, (counts.get(cycle.cropId) || 0) + 1);
    });
    return counts;
  }, [cyclesData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return crops;
    return crops.filter((crop) => crop.name.toLowerCase().includes(query));
  }, [crops, search]);

  const openAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (crop: Crop) => {
    setEditingId(crop.id);
    setFormName(crop.name);
    setFormError('');
    setShowForm(true);
  };

  /** Everything that renders a crop name caches it — drop them all. */
  const dropCaches = () => {
    clearFetchCache('crops-catalog');
    clearFetchCache('crop-new-crops');
    clearFetchCache('crop-cycles');
    clearFetchCache('dashboard-crops');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = cropCatalogFormSchema.safeParse({ name: formName });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message || 'Crop name is required');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const name = result.data.name;
      if (editingId) {
        await cropsAPI.update(editingId, { name });
        toast({ type: 'success', title: 'Crop renamed' });
      } else {
        await cropsAPI.create({ name });
        toast({ type: 'success', title: 'Crop added' });
      }
      setShowForm(false);
      dropCaches();
      refetch();
    } catch (err: any) {
      // 409 = the name already exists in this organization.
      setFormError(err.response?.data?.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (crop: Crop) => {
    const used = usage.get(crop.id) || 0;
    const warning =
      used > 0
        ? `"${crop.name}" is planted in ${used} crop cycle${used === 1 ? '' : 's'} and may not be removable.`
        : 'This action cannot be undone.';
    if (!confirm(`Delete crop "${crop.name}"?\n\n${warning}`)) return;
    try {
      await cropsAPI.delete(crop.id);
      toast({ type: 'success', title: 'Crop deleted' });
      dropCaches();
      refetch();
    } catch (err: any) {
      // 409 from the server when cycles still reference it.
      toast({
        type: 'error',
        title: 'Failed to delete crop',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <NavTabs ariaLabel="Crops section" tabs={CROPS_TABS} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crop Catalog</h1>
          <p className="mt-1 text-muted-foreground">
            Every crop your organisation plants — add, rename, or remove them here.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Crop
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search crops"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm"
          aria-label="Search crops"
        />
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={refetch}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Sprout className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                {search ? 'No crops match your search.' : 'No crops yet.'}
              </p>
              {!search && !readOnly && (
                <Button variant="outline" className="mt-4" onClick={openAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first crop
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crop</TableHead>
                    <TableHead>Cycles</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((crop) => (
                    <TableRow key={crop.id}>
                      <TableCell>
                        <span className="font-medium">{crop.name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {usage.get(crop.id) || 0}
                      </TableCell>
                      <TableCell>
                        {(!readOnly || canEdit || canRemove) && (
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(crop)}
                                aria-label={`Rename ${crop.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canRemove && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void handleDelete(crop)}
                                aria-label={`Delete ${crop.name}`}
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
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setFormError('');
          }}
          title={editingId ? 'Rename Crop' : 'Add Crop'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Crop Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Maize"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                autoFocus
              />
              {formError && <p className="mt-1 text-sm text-destructive">{formError}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingId ? 'Save Crop' : 'Create Crop'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
