'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { marketplaceAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/toasts';
import { useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { useAuth } from '@/lib/auth';

interface Listing {
  id: string;
  title: string;
  price?: number;
  quantity?: number;
  status?: string;
  entityType?: string;
  unit?: string;
  soldDate?: string;
}

interface ListingForm {
  entityType: string;
  title: string;
  price: string;
  quantity: string;
  unit: string;
  status: string;
  soldDate: string;
}

const ENTITY_OPTIONS = [
  { value: 'crop', label: 'Crop' },
  { value: 'livestock', label: 'Livestock' },
  { value: 'poultry', label: 'Poultry' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const initialForm: ListingForm = {
  entityType: 'crop',
  title: '',
  price: '',
  quantity: '',
  unit: '',
  status: 'ACTIVE',
  soldDate: '',
};

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { canCreate } = usePermission();
  const readOnly = !canCreate('finance');
  const { isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && readOnly) router.push('/marketplace');
  }, [authLoading, readOnly, router]);

  const { data: listingsData, loading } = useFetch<{ data: Listing[] }>(
    `marketplace-listing-edit-${id}`,
    () => marketplaceAPI.listListings(),
    { cacheTime: 30_000 }
  );

  const listing = listingsData?.data?.find((l) => l.id === id) ?? null;

  const [form, setForm] = useState<ListingForm>(initialForm);

  useEffect(() => {
    if (listing) {
      setForm({
        entityType: listing.entityType || 'crop',
        title: listing.title,
        price: String(listing.price ?? ''),
        quantity: String(listing.quantity ?? ''),
        unit: listing.unit || '',
        status: listing.status || 'ACTIVE',
        soldDate: listing.soldDate ? listing.soldDate.slice(0, 10) : '',
      });
    }
  }, [listing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await marketplaceAPI.updateListing(id, {
        entityType: form.entityType,
        title: form.title,
        price: Number(form.price),
        quantity: Number(form.quantity),
        unit: form.unit || undefined,
        status: form.status,
        soldDate: form.soldDate || undefined,
      });
      toast({ type: 'success', title: 'Listing updated successfully' });
      router.push(`/marketplace/listings/${id}`);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to update listing',
        message: err.response?.data?.message || 'An error occurred',
      });
    }
  };

  if (!authLoading && readOnly) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Listing not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/marketplace')}>
          Back to Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/marketplace/listings/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Listing
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Listing</h1>
        <p className="text-muted-foreground">{listing.title}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Listing details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="entityType" className="mb-1 block">
                  Listing type
                </Label>
                <Select
                  id="entityType"
                  value={form.entityType}
                  onChange={(e) => setForm({ ...form, entityType: e.target.value })}
                  options={ENTITY_OPTIONS}
                />
              </div>
              <div>
                <Label htmlFor="title" className="mb-1 block">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Fresh Tomatoes"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="price" className="mb-1 block">
                  Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="quantity" className="mb-1 block">
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="unit" className="mb-1 block">
                  Unit
                </Label>
                <Input
                  id="unit"
                  placeholder="e.g. kg"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status" className="mb-1 block">
                  Status
                </Label>
                <Select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  options={STATUS_OPTIONS}
                />
              </div>
              <div>
                <Label htmlFor="soldDate" className="mb-1 block">
                  Sold date
                </Label>
                <Input
                  id="soldDate"
                  type="date"
                  value={form.soldDate}
                  onChange={(e) => setForm({ ...form, soldDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/marketplace/listings/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
