'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Trash2,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { budgetsAPI } from '@/lib/api';
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
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

interface BudgetCategory {
  id: string;
  name: string;
  budgetAmount: number;
  spentAmount: number;
}

interface Budget {
  id: string;
  name: string;
  description?: string;
  farmId?: string;
  startDate: string;
  endDate: string;
  status: string;
  categories: BudgetCategory[];
  createdAt: string;
}

export default function BudgetsPage() {
  const readOnly = useReadOnly();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showAddCategory, setShowAddCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', description: '', farmId: '', startDate: '', endDate: '' });
  const [catForm, setCatForm] = useState({ name: '', budgetAmount: '' });

  const { data: budgetsData, loading, refetch } = useFetch<{ data: Budget[] }>(
    'budgets-list',
    () => budgetsAPI.list(),
    { cacheTime: 30_000 }
  );

  const budgets: Budget[] = budgetsData?.data || [];

  const totals = React.useMemo(() => {
    const allCats = budgets.flatMap((b) => b.categories || []);
    const totalBudget = allCats.reduce((a, c) => a + c.budgetAmount, 0);
    const totalSpent = allCats.reduce((a, c) => a + c.spentAmount, 0);
    return { totalBudget, totalSpent, remaining: totalBudget - totalSpent };
  }, [budgets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await budgetsAPI.create(form);
      toast({ type: 'success', title: 'Budget created' });
      setShowCreate(false);
      setForm({ name: '', description: '', farmId: '', startDate: '', endDate: '' });
      clearFetchCache('budgets-list');
      refetch();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to create budget', message: err.response?.data?.message || 'Error' });
    } finally { setSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    setSaving(true);
    try {
      await budgetsAPI.update(editingBudget.id, form);
      toast({ type: 'success', title: 'Budget updated' });
      setEditingBudget(null);
      setForm({ name: '', description: '', farmId: '', startDate: '', endDate: '' });
      clearFetchCache('budgets-list');
      refetch();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to update budget', message: err.response?.data?.message || 'Error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete budget "${name}"? This action cannot be undone.`)) return;
    try {
      await budgetsAPI.delete(id);
      toast({ type: 'success', title: 'Budget deleted' });
      clearFetchCache('budgets-list');
      refetch();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to delete budget', message: err.response?.data?.message || 'Error' });
    }
  };

  const handleAddCategory = async (budgetId: string) => {
    if (!catForm.name || !catForm.budgetAmount) return;
    try {
      await budgetsAPI.addCategory(budgetId, { name: catForm.name, budgetAmount: parseFloat(catForm.budgetAmount) });
      toast({ type: 'success', title: 'Category added' });
      setShowAddCategory(null);
      setCatForm({ name: '', budgetAmount: '' });
      clearFetchCache('budgets-list');
      refetch();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to add category', message: err.response?.data?.message || 'Error' });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await budgetsAPI.deleteCategory(categoryId);
      toast({ type: 'success', title: 'Category deleted' });
      clearFetchCache('budgets-list');
      refetch();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to delete category', message: err.response?.data?.message || 'Error' });
    }
  };

  const handleRefresh = async (budgetId: string) => {
    try {
      await budgetsAPI.refresh(budgetId);
      toast({ type: 'success', title: 'Spent amounts refreshed' });
      clearFetchCache('budgets-list');
      refetch();
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to refresh', message: err.response?.data?.message || 'Error' });
    }
  };

  const startEdit = (budget: Budget) => {
    setForm({
      name: budget.name,
      description: budget.description || '',
      farmId: budget.farmId || '',
      startDate: budget.startDate.split('T')[0],
      endDate: budget.endDate.split('T')[0],
    });
    setEditingBudget(budget);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/finance" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="mr-1 h-4 w-4" />Back to Finance
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Track spending against your budget categories</p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />New Budget
          </Button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">
                <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.remaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budgets List */}
      {budgets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No budgets yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first budget to start tracking spending.</p>
            {!readOnly && (
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />Create Budget
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        budgets.map((budget) => {
          const totalBudget = (budget.categories || []).reduce((a, c) => a + c.budgetAmount, 0);
          const totalSpent = (budget.categories || []).reduce((a, c) => a + c.spentAmount, 0);
          const pct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
          return (
            <Card key={budget.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {budget.name}
                    <Badge variant={budget.status === 'ACTIVE' ? 'success' : budget.status === 'CLOSED' ? 'secondary' : 'outline'}>
                      {budget.status}
                    </Badge>
                  </CardTitle>
                  {budget.description && <p className="text-sm text-muted-foreground mt-1">{budget.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(budget.startDate).toLocaleDateString()} — {new Date(budget.endDate).toLocaleDateString()}</span>
                    <span>{pct}% used</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => handleRefresh(budget.id)} title="Refresh spent amounts">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(budget)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(budget.id, budget.name)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Spent</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Status</TableHead>
                        {!readOnly && <TableHead className="w-[60px]" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(budget.categories || []).map((cat) => {
                        const remaining = cat.budgetAmount - cat.spentAmount;
                        const catPct = cat.budgetAmount > 0 ? (cat.spentAmount / cat.budgetAmount) * 100 : 0;
                        const status = catPct > 100 ? 'over' : catPct > 80 ? 'near' : 'on-track';
                        return (
                          <TableRow key={cat.id}>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell>{formatCurrency(cat.budgetAmount)}</TableCell>
                            <TableCell>{formatCurrency(cat.spentAmount)}</TableCell>
                            <TableCell>
                              <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(remaining)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={status === 'over' ? 'destructive' : status === 'near' ? 'warning' : 'success'}>
                                {status === 'over' ? 'Over Budget' : status === 'near' ? 'Near Limit' : 'On Track'}
                              </Badge>
                            </TableCell>
                            {!readOnly && (
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {!readOnly && (
                  <div className="mt-3">
                    {showAddCategory === budget.id ? (
                      <div className="flex items-center gap-2">
                        <Input placeholder="Category name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="w-48" />
                        <Input placeholder="Budget amount" type="number" value={catForm.budgetAmount} onChange={(e) => setCatForm({ ...catForm, budgetAmount: e.target.value })} className="w-32" />
                        <Button size="sm" onClick={() => handleAddCategory(budget.id)}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowAddCategory(null); setCatForm({ name: '', budgetAmount: '' }); }}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setShowAddCategory(budget.id)}>
                        <Plus className="mr-1 h-3 w-3" />Add Category
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Create Budget Dialog */}
      {showCreate && (
        <Dialog open={showCreate} onOpenChange={setShowCreate} title="Create Budget">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name <span className="text-destructive">*</span></label>
              <Input placeholder="e.g. 2026 Operating Budget" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date <span className="text-destructive">*</span></label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date <span className="text-destructive">*</span></label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Create Budget</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Edit Budget Dialog */}
      {editingBudget && (
        <Dialog open={!!editingBudget} onOpenChange={() => setEditingBudget(null)} title="Edit Budget">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingBudget(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
