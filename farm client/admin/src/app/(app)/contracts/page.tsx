'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Trash2,
  Pencil,
} from 'lucide-react';
import { contractsAPI } from '@/lib/api';
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
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { LoadingSpinner } from '@/components/ui/loading';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';

interface Contract {
  id: string;
  type: string;
  counterpartyName: string;
  value?: number;
  currency?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  terms?: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Terminated', label: 'Terminated' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'Buy', label: 'Buy' },
  { value: 'Sell', label: 'Sell' },
];

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-blue-100 text-blue-800',
  Terminated: 'bg-red-100 text-red-800',
};

const TYPE_COLORS: Record<string, string> = {
  Buy: 'bg-blue-100 text-blue-800',
  Sell: 'bg-purple-100 text-purple-800',
};

const PAGE_SIZE = 10;

export default function ContractsPage() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const {
    data,
    loading,
    refetch,
  } = useFetch<{ data: Contract[]; total: number; totalPages: number }>(
    'contracts-list',
    useCallback(async () => {
      return await contractsAPI.list({
        search,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
    }, [search, statusFilter, typeFilter, page])
  );

  const contracts = data?.data || [];

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete contract with "${name}"? This action cannot be undone.`)) return;
    try {
      await contractsAPI.delete(id);
      clearFetchCache('contracts');
      refetch();
    } catch {
      // error handled by toast
    }
  };

  const formatCurrency = (value?: number, currency?: string) => {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
          <p className="text-muted-foreground">Manage buy and sell contracts</p>
        </div>
        {!readOnly && (
          <Button onClick={() => router.push('/contracts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contract
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              options={TYPE_OPTIONS}
            />
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        </Card>
      ) : contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || statusFilter || typeFilter
                ? 'No contracts match your filters.'
                : 'No contracts yet. Create your first contract!'}
            </p>
            {!search && !statusFilter && !typeFilter && !readOnly && (
              <Button className="mt-4" onClick={() => router.push('/contracts/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contract
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow
                      key={contract.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/contracts/${contract.id}`)}
                    >
                      <TableCell>
                        <Badge className={TYPE_COLORS[contract.type] || ''} variant="secondary">
                          {contract.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {contract.counterpartyName}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(contract.value, contract.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[contract.status] || ''} variant="secondary">
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contract.startDate ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(contract.startDate).toLocaleDateString()}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {contract.endDate ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(contract.endDate).toLocaleDateString()}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!readOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  router.push(`/contracts/${contract.id}/edit`)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() =>
                                  handleDelete(
                                    contract.id,
                                    contract.counterpartyName
                                  )
                                }
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
          </Card>

          {data?.totalPages && data.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
