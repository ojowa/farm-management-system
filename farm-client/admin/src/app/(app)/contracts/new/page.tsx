'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { contractsAPI } from '@/lib/api';
import { useToast } from '@/lib/toasts';
import { clearFetchCache } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';
import { ContractForm, ContractFormValues } from '@/components/ContractForm';

export default function NewContractPage() {
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

  const handleSubmit = async (form: ContractFormValues) => {
    try {
      await contractsAPI.create({
        type: form.type,
        buyerSellerName: form.buyerSellerName,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        value: form.value ? Number(form.value) : undefined,
        terms: form.terms || undefined,
      });
      toast({ type: 'success', title: 'Contract created successfully' });
      clearFetchCache('contracts');
      router.push('/contracts');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to create contract',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  if (!authLoading && readOnly) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/contracts"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Contracts
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add Contract</h1>
        <p className="text-muted-foreground">Create a new contract</p>
      </div>

      <ContractForm
        submitLabel="Create Contract"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/contracts')}
      />
    </div>
  );
}
