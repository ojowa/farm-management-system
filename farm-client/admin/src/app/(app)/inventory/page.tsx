'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  Eye,
  Calendar,
} from 'lucide-react';
import { inventoryAPI, farmsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { useReadOnly } from '@/lib/useReadOnly';
import { inventoryFormSchema } from '@/lib/validation';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit?: string;
  farmId: string;
  farm?: { id: string; name: string };
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function InventoryPage() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', quantity: '', unit: '', farmId: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: inventoryData,
    loading,
    refetch,
  } = useFetch<{ data: InventoryItem[]; total: number; page: number; totalPages: number }>(
    'inventory-list',
    () => inventoryAPI.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const { data: farmsData } = useFetch<{ data: { id: string; name: string }[] }>(
    'farms-list',
    () => farmsAPI.list({ limit: 100 }),
    { cacheTime: 60_000 }
  );

  const farms = farmsData?.data || [];
  const inventory = inventoryData?.data || [];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('inventory');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('inventory', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = inventory;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter);
    }
    return result;
  }, [inventory, search, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map((item) => item.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [inventory]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = inventoryFormSchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      await inventoryAPI.create({
        name: form.name,
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit,
        farmId: form.farmId,
      });
      toast({ type: 'success', title: 'Inventory item created successfully' });
      setShowAdd(false);
      setForm({ name: '', category: '', quantity: '', unit: '', farmId: '' });
      clearFetchCache('inventory');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create inventory item',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await inventoryAPI.delete(id);
      toast({ type: 'success', title: 'Inventory item deleted' });
      clearFetchCache('inventory');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete inventory item',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage your farm inventory items</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/inventory/adjustments">
            <Button variant="outline">Adjustments</Button>
          </Link>
          {!readOnly && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              placeholder="All categories"
              options={categories.map((c) => ({ value: c, label: c }))}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            />
            {(search || categoryFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : paginated.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || categoryFilter
                ? 'No inventory items match your filters.'
                : 'No inventory items yet. Add your first item!'}
            </p>
            {!search && !categoryFilter && !readOnly && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/inventory/${item.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.quantity}</span>
                      </TableCell>
                      <TableCell>{item.unit || '—'}</TableCell>
                      <TableCell>
                        {item.farm?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/inventory/${item.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  router.push(`/inventory/${item.id}/edit`)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(item.id, item.name)}
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
            {totalPages > 1 && (
              <div className="border-t p-4 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add Inventory Dialog */}
      {!readOnly && (
        <Dialog open={showAdd} onOpenChange={setShowAdd} title="Add Inventory Item">
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Item Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Fertilizer, Seeds, Tools"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive mt-1">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Category <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Feed, Seeds, Tools, Chemicals"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              {formErrors.category && (
                <p className="text-sm text-destructive mt-1">{formErrors.category}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Quantity <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
                {formErrors.quantity && (
                  <p className="text-sm text-destructive mt-1">{formErrors.quantity}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Unit</label>
                <Input
                  placeholder="kg, bags, litres"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Farm <span className="text-destructive">*</span>
              </label>
              <Select
                placeholder="Select a farm"
                options={farms.map((f) => ({ value: f.id, label: f.name }))}
                value={form.farmId}
                onChange={(e) => setForm({ ...form, farmId: e.target.value })}
              />
              {formErrors.farmId && (
                <p className="text-sm text-destructive mt-1">{formErrors.farmId}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create Item
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
