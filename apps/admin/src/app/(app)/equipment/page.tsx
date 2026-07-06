'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Wrench,
  Calendar,
  Trash2,
  Pencil,
} from 'lucide-react';
import { equipmentAPI } from '@/lib/api';
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

interface Equipment {
  id: string;
  name: string;
  type: string;
  model?: string;
  serialNumber?: string;
  status: string;
  nextMaintenance?: string;
  purchaseDate?: string;
  cost?: number;
  farmId?: string;
  farm?: { id: string; name: string };
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Under Maintenance', label: 'Under Maintenance' },
  { value: 'Retired', label: 'Retired' },
];

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  'Under Maintenance': 'bg-yellow-100 text-yellow-800',
  Retired: 'bg-gray-100 text-gray-800',
};

const PAGE_SIZE = 10;

export default function EquipmentPage() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const {
    data,
    loading,
    refetch,
  } = useFetch<{ data: Equipment[]; total: number; totalPages: number }>(
    'equipment-list',
    useCallback(async () => {
      return await equipmentAPI.list({
        search,
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
    }, [search, statusFilter, page])
  );

  const equipment = data?.data || [];

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await equipmentAPI.delete(id);
      clearFetchCache('equipment');
      refetch();
    } catch {
      // error handled by toast
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground">Manage farm equipment and machinery</p>
        </div>
        {!readOnly && (
          <Button onClick={() => router.push('/equipment/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
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
      ) : equipment.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || statusFilter
                ? 'No equipment match your filters.'
                : 'No equipment yet. Add your first piece of equipment!'}
            </p>
            {!search && !statusFilter && !readOnly && (
              <Button className="mt-4" onClick={() => router.push('/equipment/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Maintenance</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/equipment/${item.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{item.name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.type || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.model || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {item.serialNumber || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[item.status] || ''} variant="secondary">
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.nextMaintenance ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.nextMaintenance).toLocaleDateString()}
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
                                  router.push(`/equipment/${item.id}/edit`)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() =>
                                  handleDelete(item.id, item.name)
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
