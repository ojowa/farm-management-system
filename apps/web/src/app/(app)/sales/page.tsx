'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { poultrySalesAPI, farmsAPI } from '@/lib/api';
import { Button, Modal, Input, Select, TextArea } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import FilterBar from '@/components/FilterBar';
import { useToasts } from '@/lib/toasts';

interface Sale { id: string; productType: string; productName: string; quantity: number; unit: string; totalPrice: number; buyerName?: string; farmId: string; farmName?: string; date: string; }

const PAGE_SIZE = 10;

export default function SalesPage() {
  const router = useRouter();
  const { success, error: toastError } = useToasts();
  const [sales, setSales] = useState<Sale[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ productType: 'eggs', productName: '', quantity: '', unit: 'kg', totalPrice: '', buyerName: '', farmId: '', date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, farmsRes] = await Promise.all([poultrySalesAPI.list(), farmsAPI.list()]);
      setSales(sRes.data.sales || sRes.data || []);
      setFarms(farmsRes.data.farms || farmsRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setPage(1); }, [search, typeFilter]);

  const filtered = useMemo(() => {
    let result = sales;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.productName.toLowerCase().includes(q) || s.buyerName?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter((s) => s.productType === typeFilter);
    }
    return result;
  }, [sales, search, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalRevenue = filtered.reduce((sum, s) => sum + (s.totalPrice || 0), 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await poultrySalesAPI.create({ ...form, quantity: Number(form.quantity), totalPrice: Number(form.totalPrice) });
      success('Sale recorded');
      setShowAdd(false);
      setForm({ productType: 'eggs', productName: '', quantity: '', unit: 'kg', totalPrice: '', buyerName: '', farmId: '', date: '', notes: '' });
      load();
    } catch (err: any) { toastError(err.response?.data?.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Record and track product sales</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Record Sale</Button>
      </div>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <p className="text-sm text-gray-500">Total Revenue (filtered)</p>
        <p className="text-3xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by product or buyer…"
        filters={[
          {
            key: 'productType',
            label: 'All product types',
            options: [
              { value: 'eggs', label: 'Eggs' },
              { value: 'meat', label: 'Meat' },
              { value: 'milk', label: 'Milk' },
              { value: 'crops', label: 'Crops' },
              { value: 'livestock', label: 'Livestock' },
              { value: 'other', label: 'Other' },
            ],
          },
        ]}
        filterValues={{ productType: typeFilter }}
        onFilterChange={(_key, val) => setTypeFilter(val)}
        onClear={() => { setSearch(''); setTypeFilter(''); }}
      />

      <DataTable
        data={paginated}
        loading={loading}
        emptyMessage={search || typeFilter ? 'No sales match your filters.' : 'No sales recorded yet.'}
        emptyIcon="💰"
        onRowClick={(s) => router.push(`/sales/${s.id}`)}
        columns={[
          { key: 'productName', label: 'Product', render: (s) => <span className="font-medium">{s.productName}</span> },
          { key: 'productType', label: 'Type', render: (s) => <span className="capitalize">{s.productType}</span> },
          { key: 'quantity', label: 'Qty', render: (s) => `${s.quantity} ${s.unit}` },
          { key: 'totalPrice', label: 'Amount', render: (s) => <span className="font-semibold text-green-600">${s.totalPrice?.toLocaleString()}</span> },
          { key: 'buyerName', label: 'Buyer', render: (s) => s.buyerName || '—' },
          { key: 'farmName', label: 'Farm', render: (s) => s.farmName || '—' },
          { key: 'date', label: 'Date', render: (s) => new Date(s.date).toLocaleDateString() },
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record Sale">
        <form onSubmit={handleAdd}>
          <Select label="Product Type" value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })}>
            <option value="eggs">Eggs</option><option value="meat">Meat</option><option value="milk">Milk</option><option value="crops">Crops</option><option value="livestock">Livestock</option><option value="other">Other</option>
          </Select>
          <Input label="Product Name" required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Organic Eggs" />
          <Input label="Quantity" type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="kg">kg</option><option value="pieces">pieces</option><option value="liters">liters</option><option value="tons">tons</option><option value="crates">crates</option>
          </Select>
          <Input label="Total Price ($)" type="number" required value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} />
          <Input label="Buyer Name" value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} />
          <Select label="Farm" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            <option value="">Select farm</option>
            {farms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Record Sale</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
