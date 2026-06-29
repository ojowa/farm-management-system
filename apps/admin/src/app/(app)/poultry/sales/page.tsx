'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  DollarSign,
  Calendar,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { poultrySalesAPI } from '@/lib/api';
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
import { Pagination } from '@/components/ui/pagination';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';

interface Sale {
  id: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  buyer?: string;
  notes?: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function SalesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    item: '',
    quantity: '',
    price: '',
    date: '',
    buyer: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const {
    data: salesData,
    loading,
    refetch,
  } = useFetch<{ data: Sale[]; total: number; page: number; totalPages: number }>(
    'sales-list',
    () => poultrySalesAPI.list({ page, limit: PAGE_SIZE }),
    { cacheTime: 30_000 }
  );

  const sales = salesData?.data || [];

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (['created', 'updated', 'deleted'].includes(event.action)) {
        clearFetchCache('sales');
        refetch();
      }
    },
    [refetch]
  );
  useRealtime('sale', handleRealtimeEvent);

  const filtered = useMemo(() => {
    let result = sales;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.item.toLowerCase().includes(q) ||
          s.buyer?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sales, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalRevenue = useMemo(() => {
    return filtered.reduce((sum, s) => sum + (s.total || s.quantity * s.price), 0);
  }, [filtered]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item || !form.quantity || !form.price || !form.date) {
      const errors: Record<string, string> = {};
      if (!form.item) errors.item = 'Item name is required';
      if (!form.quantity) errors.quantity = 'Quantity is required';
      if (!form.price) errors.price = 'Price is required';
      if (!form.date) errors.date = 'Date is required';
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      await poultrySalesAPI.create({
        item: form.item,
        quantity: Number(form.quantity),
        price: Number(form.price),
        date: form.date,
        buyer: form.buyer,
      });
      toast({ type: 'success', title: 'Sale recorded successfully' });
      setShowAdd(false);
      setForm({ item: '', quantity: '', price: '', date: '', buyer: '' });
      clearFetchCache('sales');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to record sale',
        message: err.response?.data?.message || 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale record? This action cannot be undone.')) return;
    try {
      await poultrySalesAPI.delete(id);
      toast({ type: 'success', title: 'Sale record deleted' });
      clearFetchCache('sales');
      refetch();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete sale record',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">Track poultry product sales</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Sale
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-semibold">
                  ₦{totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-lg font-semibold">{filtered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-lg font-semibold">
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item or buyer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        ) : paginated.length === 0 ? (
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search
                ? 'No sales match your search.'
                : 'No sales yet. Record your first sale!'}
            </p>
            {!search && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Sale
              </Button>
            )}
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <span className="font-medium">{sale.item}</span>
                      </TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell>₦{sale.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="success">
                          ₦{(sale.total || sale.quantity * sale.price).toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(sale.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/poultry/sales/${sale.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/poultry/sales/${sale.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(sale.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <Dialog open={showAdd} onOpenChange={setShowAdd} title="Record Sale">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Item <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Eggs, Meat, etc."
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
            />
            {formErrors.item && (
              <p className="text-sm text-destructive mt-1">{formErrors.item}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Quantity <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              placeholder="100"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            {formErrors.quantity && (
              <p className="text-sm text-destructive mt-1">{formErrors.quantity}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Unit Price (₦) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              placeholder="500"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            {formErrors.price && (
              <p className="text-sm text-destructive mt-1">{formErrors.price}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Buyer</label>
            <Input
              placeholder="Buyer name"
              value={form.buyer}
              onChange={(e) => setForm({ ...form, buyer: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            {formErrors.date && (
              <p className="text-sm text-destructive mt-1">{formErrors.date}</p>
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
              Record Sale
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}