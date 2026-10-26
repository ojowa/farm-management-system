'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { contractsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { clearFetchCache, useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';
import { ContractForm, ContractFormValues, toContractFormValues } from '@/components/ContractForm';

export default function EditContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('finance');
  const { isLoading: authLoading } = useAuth();

  // Redirect only once the auth context has settled — an early return
  // before the hooks below used to crash the page on a cold load (the
  // hook count flipped the moment `user` hydrated).
  useEffect(() => {
    if (!authLoading && readOnly) router.push('/contracts');
  }, [authLoading, readOnly, router]);

  const { data, loading } = useFetch<any>(`contracts-${id}`, () => contractsAPI.get(id), {
    cacheTime: 30_000,
  });
  const contract = (data as any)?.data ?? data ?? null;

  const handleSubmit = async (form: ContractFormValues) => {
    try {
      await contractsAPI.update(id, {
        type: form.type,
        buyerSellerName: form.buyerSellerName,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        value: form.value ? Number(form.value) : undefined,
        terms: form.terms || undefined,
      });
      toast({ type: 'success', title: 'Contract updated successfully' });
      clearFetchCache('contracts');
      router.push(`/contracts/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update contract',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  if (!authLoading && readOnly) return null;

  // The form seeds its state on mount, so wait for the row instead of
  // rendering an empty one and losing the loaded values.
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/contracts/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Contract
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Contract</h1>
        <p className="text-muted-foreground">
          {contract.buyerSellerName || contract.counterpartyName || 'Contract'}
        </p>
      </div>

      <ContractForm
        initialValues={toContractFormValues(contract)}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/contracts/${id}`)}
      />
    </div>
  );
}
