'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { financeAPI } from '@/lib/api';
import { Card, Badge } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';

interface Transaction { id: string; type: string; amount: number; category: string; description?: string; date: string; }

const TYPE_COLORS: Record<string, string> = { income: 'green', expense: 'red', transfer: 'blue' };
const PAGE_SIZE = 10;

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const [expensesRes, salesRes] = await Promise.allSettled([
          financeAPI.listExpenses(),
          financeAPI.listSales(),
        ]);
        const expensesList = expensesRes.status === 'fulfilled' ? (expensesRes.value.data.expenses || expensesRes.value.data || []) : [];
        const salesList = salesRes.status === 'fulfilled' ? (salesRes.value.data.sales || salesRes.value.data || []) : [];
        const txns = [
          ...expensesList.map((e: any) => ({ ...e, type: 'expense' })),
          ...salesList.map((s: any) => ({ ...s, type: 'income' })),
        ];
        setTransactions(txns);
        const income = txns.filter((t: Transaction) => t.type === 'income').reduce((s: number, t: Transaction) => s + Math.abs(t.amount), 0);
        const expense = txns.filter((t: Transaction) => t.type === 'expense').reduce((s: number, t: Transaction) => s + Math.abs(t.amount), 0);
        setSummary({ income, expense, net: income - expense });
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => { setPage(1); }, [search, typeFilter]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.description?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter((t) => t.type === typeFilter);
    }
    return result;
  }, [transactions, search, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance & Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track income and expenses across your farm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card><p className="text-sm text-gray-500">Total Income</p><p className="text-2xl font-bold text-green-600">${summary.income.toLocaleString()}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Expenses</p><p className="text-2xl font-bold text-red-600">${summary.expense.toLocaleString()}</p></Card>
        <Card><p className="text-sm text-gray-500">Net Profit</p><p className={`text-2xl font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>${summary.net.toLocaleString()}</p></Card>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search transactions…"
        filters={[
          {
            key: 'type',
            label: 'All types',
            options: [
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
              { value: 'transfer', label: 'Transfer' },
            ],
          },
        ]}
        filterValues={{ type: typeFilter }}
        onFilterChange={(_key, val) => setTypeFilter(val)}
        onClear={() => { setSearch(''); setTypeFilter(''); }}
      />

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search || typeFilter ? 'No transactions match your filters.' : 'No transactions recorded yet.'}
        emptyIcon="📊"
        columns={[
          { key: 'description', label: 'Description', render: (t) => <span className="font-medium">{t.description || '—'}</span> },
          { key: 'type', label: 'Type', render: (t) => <Badge color={TYPE_COLORS[t.type] || 'gray'}>{t.type}</Badge> },
          { key: 'category', label: 'Category' },
          { key: 'amount', label: 'Amount', render: (t) => <span className={t.type === 'expense' ? 'text-red-600' : 'text-green-600'}>${Math.abs(t.amount).toFixed(2)}</span> },
          { key: 'date', label: 'Date', render: (t) => new Date(t.date).toLocaleDateString() },
        ]}
        footer={
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        }
      />
    </div>
  );
}
