'use client';

import React, { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  Pencil,
  Trash2,
  User,
} from 'lucide-react';
import { contractsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useRealtime } from '@/hooks/useRealtime';
import { usePermission } from '@/lib/usePermission';
import { RecordTasksCard } from '@/components/RecordTasksCard';

interface Contract {
  id: string;
  type: string;
  buyerSellerName?: string;
  counterpartyName?: string;
  status: string;
  value?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  terms?: string;
  createdByName?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-blue-100 text-blue-800',
  Terminated: 'bg-red-100 text-red-800',
  // Statuses the schema also allows (defaults to DRAFT on insert).
  DRAFT: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const TYPE_COLORS: Record<string, string> = {
  Buy: 'bg-blue-100 text-blue-800',
  Sell: 'bg-purple-100 text-purple-800',
  BUY: 'bg-blue-100 text-blue-800',
  SELL: 'bg-purple-100 text-purple-800',
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : '—';

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate, canDelete } = usePermission();
  const readOnly = !canCreate('finance');
  // Delete is finance.delete on the API (finance.controller), not finance.write.
  const canRemove = canDelete('finance');

  const {
    data,
    loading,
    refetch,
  } = useFetch<Contract>(`contracts-${id}`, () => contractsAPI.get(id), {
    cacheTime: 30_000,
  });

  // The gateway envelope is unwrapped by the client, so the row arrives as
  // `response.data`; accept a bare object too rather than showing "not found".
  const contract = ((data as any)?.data ?? data ?? null) as Contract | null;

  const handleRealtimeEvent = useCallback(
    (event: { entity: string; action: string; data: any }) => {
      if (event.data?.id === id) refetch();
    },
    [id, refetch]
  );
  // FinanceEventService publishes every contract change as entity 'finance'.
  useRealtime('finance', handleRealtimeEvent);

  const handleDelete = async () => {
    const name = contract?.buyerSellerName || contract?.counterpartyName || 'this contract';
    if (!contract || !confirm(`Delete contract with "${name}"? This action cannot be undone.`))
      return;
    try {
      await contractsAPI.delete(contract.id);
      toast({ type: 'success', title: 'Contract deleted' });
      clearFetchCache('contracts');
      router.push('/contracts');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to delete contract',
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

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Contract not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/contracts')}>
          Back to Contracts
        </Button>
      </div>
    );
  }

  const counterparty = contract.buyerSellerName || contract.counterpartyName || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/contracts"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Contracts
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{counterparty}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={TYPE_COLORS[contract.type] || ''}>
                {contract.type}
              </Badge>
              <Badge variant="secondary" className={STATUS_COLORS[contract.status] || ''}>
                {contract.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!readOnly && (
              <Button
                variant="outline"
                onClick={() => router.push(`/contracts/${contract.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {canRemove && (
              <Button variant="destructive" onClick={handleDelete}>
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
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="text-lg font-semibold">
                  {contract.value != null
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: contract.currency || 'USD',
                        minimumFractionDigits: 0,
                      }).format(contract.value)
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="text-lg font-semibold">
                  {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">{contract.status}</p>
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
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Counterparty</p>
              <p className="font-medium">{counterparty}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{contract.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start date</p>
              <p className="font-medium">{formatDate(contract.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End date</p>
              <p className="font-medium">{formatDate(contract.endDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(contract.createdAt)}</p>
            </div>
            {contract.createdByName && (
              <div>
                <p className="text-sm text-muted-foreground">Created by</p>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {contract.createdByName}
                </p>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Terms</p>
            <p className="whitespace-pre-wrap text-sm">
              {contract.terms || 'No terms recorded.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tasks raised against this contract. */}
      <RecordTasksCard moduleKey="contract" recordId={contract.id} recordName={counterparty} />
    </div>
  );
}
