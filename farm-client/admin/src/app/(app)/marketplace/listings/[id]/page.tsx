'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet, Trash2, User, Calendar } from 'lucide-react';
import { marketplaceAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useFetch } from '@/hooks/useFetch';
import { usePermission } from '@/lib/usePermission';
import { formatCurrency } from '@/lib/formatters';

interface Listing {
  id: string;
  title: string;
  price?: number;
  quantity?: number;
  status?: string;
  buyer?: { id: string; name: string };
  soldDate?: string;
  entityType?: string;
  createdAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SOLD: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canDelete, canCreate } = usePermission();
  const readOnly = !canCreate('finance');
  const canRemove = canDelete('finance');

  const { data: listingsData, loading } = useFetch<{ data: Listing[] }>(
    `marketplace-listing-${id}`,
    () => marketplaceAPI.listListings(),
    { cacheTime: 30_000 }
  );

  const listing = listingsData?.data?.find((l) => l.id === id) ?? null;

  const handleDelete = async () => {
    if (!listing || !confirm(`Delete listing "${listing.title}"? This action cannot be undone.`))
      return;
    try {
      await marketplaceAPI.deleteListing(listing.id);
      router.push('/marketplace');
    } catch {
      // error handled by toast
    }
  };

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
    <div className="space-y-6">
      <div>
        <Link
          href="/marketplace"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Marketplace
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{listing.title}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className={STATUS_COLORS[listing.status || ''] || ''}>
            {listing.status?.charAt(0) + (listing.status || '').slice(1).toLowerCase()}
          </Badge>
          <Badge variant="secondary">{listing.entityType || 'Listing'}</Badge>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        {!readOnly && (
          <Link href={`/marketplace/listings/${id}/edit`}>
            <Button variant="outline">
              <Wallet className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
        {canRemove && (
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-lg font-semibold">
                  {listing.price != null ? formatCurrency(listing.price) : '—'}
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
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="text-lg font-semibold">{listing.quantity ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/30">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Buyer</p>
                <p className="text-lg font-semibold">
                  {listing.buyer?.name || '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{listing.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sold date</p>
              <p className="font-medium">
                {listing.soldDate ? new Date(listing.soldDate).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
