'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Pencil,
  Users,
} from 'lucide-react';
import { marketplaceAPI } from '@/lib/api';
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
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { LoadingSpinner } from '@/components/ui/loading';
import { useFetch, clearFetchCache } from '@/hooks/useFetch';
import { useReadOnly } from '@/lib/useReadOnly';
import { Dialog } from '@/components/ui/dialog';

interface Buyer {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  type: string;
}

interface Listing {
  id: string;
  title: string;
  price?: number;
  quantity?: string;
  status: string;
  buyer?: { id: string; name: string };
}

const BUYER_TYPE_OPTIONS = [
  { value: 'Individual', label: 'Individual' },
  { value: 'Company', label: 'Company' },
  { value: 'Cooperative', label: 'Cooperative' },
];

const LISTING_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Sold', label: 'Sold' },
  { value: 'Draft', label: 'Draft' },
];

const LISTING_STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  Sold: 'bg-blue-100 text-blue-800',
  Draft: 'bg-gray-100 text-gray-800',
};

const PAGE_SIZE = 10;

type Tab = 'buyers' | 'listings';

export default function MarketplacePage() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const [activeTab, setActiveTab] = useState<Tab>('buyers');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddBuyer, setShowAddBuyer] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);

  const [buyerForm, setBuyerForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    type: 'Individual',
  });
  const [listingForm, setListingForm] = useState({
    title: '',
    price: '',
    quantity: '',
    status: 'Active',
    buyerId: '',
  });
  const [buyerErrors, setBuyerErrors] = useState<Record<string, string>>({});
  const [listingErrors, setListingErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: buyersData, refetch: refetchBuyers, loading: buyersLoading } = useFetch<{
    data: Buyer[];
    total: number;
    totalPages: number;
  }>(
    'marketplace-buyers',
    useCallback(async () => {
      return await marketplaceAPI.listBuyers({
        search,
        page,
        limit: PAGE_SIZE,
      });
    }, [search, page])
  );

  const { data: listingsData, refetch: refetchListings, loading: listingsLoading } = useFetch<{
    data: Listing[];
    total: number;
    totalPages: number;
  }>(
    'marketplace-listings',
    useCallback(async () => {
      return await marketplaceAPI.listListings({
        search,
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
    }, [search, statusFilter, page])
  );

  const buyers = buyersData?.data || [];
  const listings = listingsData?.data || [];

  const handleCreateBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerForm.name.trim()) {
      setBuyerErrors({ name: 'Name is required' });
      return;
    }
    setBuyerErrors({});
    setSaving(true);
    try {
      await marketplaceAPI.createBuyer(buyerForm);
      setShowAddBuyer(false);
      setBuyerForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        type: 'Individual',
      });
      clearFetchCache('marketplace-buyers');
      refetchBuyers();
    } catch (err: any) {
      // error handled by toast
    } finally {
      setSaving(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingForm.title.trim()) {
      setListingErrors({ title: 'Title is required' });
      return;
    }
    setListingErrors({});
    setSaving(true);
    try {
      await marketplaceAPI.createListing({
        title: listingForm.title,
        price: listingForm.price ? Number(listingForm.price) : undefined,
        quantity: listingForm.quantity || undefined,
        status: listingForm.status,
        buyerId: listingForm.buyerId || undefined,
      });
      setShowAddListing(false);
      setListingForm({
        title: '',
        price: '',
        quantity: '',
        status: 'Active',
        buyerId: '',
      });
      clearFetchCache('marketplace-listings');
      refetchListings();
    } catch (err: any) {
      // error handled by toast
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBuyer = async (id: string, name: string) => {
    if (!confirm(`Delete buyer "${name}"? This action cannot be undone.`)) return;
    try {
      await marketplaceAPI.deleteBuyer(id);
      clearFetchCache('marketplace-buyers');
      refetchBuyers();
    } catch {
      // error handled by toast
    }
  };

  const handleDeleteListing = async (id: string, title: string) => {
    if (!confirm(`Delete listing "${title}"? This action cannot be undone.`)) return;
    try {
      await marketplaceAPI.deleteListing(id);
      clearFetchCache('marketplace-listings');
      refetchListings();
    } catch {
      // error handled by toast
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const currentData = activeTab === 'buyers' ? buyersData : listingsData;
  const currentLoading = activeTab === 'buyers' ? buyersLoading : listingsLoading;
  const currentItems = activeTab === 'buyers' ? buyers : listings;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground">Manage buyers and product listings</p>
        </div>
        {!readOnly && (
          <Button
            onClick={() =>
              activeTab === 'buyers'
                ? setShowAddBuyer(true)
                : setShowAddListing(true)
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === 'buyers' ? 'Add Buyer' : 'Add Listing'}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={activeTab === 'buyers' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('buyers')}
              >
                <Users className="mr-2 h-4 w-4" />
                Buyers
              </Button>
              <Button
                variant={activeTab === 'listings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('listings')}
              >
                <Store className="mr-2 h-4 w-4" />
                Listings
              </Button>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            {activeTab === 'listings' && (
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={LISTING_STATUS_OPTIONS}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {currentLoading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </CardContent>
        </Card>
      ) : currentItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {activeTab === 'buyers' ? (
              <>
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {search
                    ? 'No buyers match your search.'
                    : 'No buyers yet. Add your first buyer!'}
                </p>
              </>
            ) : (
              <>
                <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {search || statusFilter
                    ? 'No listings match your filters.'
                    : 'No listings yet. Create your first listing!'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                {activeTab === 'buyers' ? (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buyers.map((buyer) => (
                        <TableRow
                          key={buyer.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/marketplace/buyers/${buyer.id}`)}
                        >
                          <TableCell>
                            <span className="font-medium">{buyer.name}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {buyer.contactPerson || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {buyer.email || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {buyer.phone || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{buyer.type}</Badge>
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
                                      router.push(
                                        `/marketplace/buyers/${buyer.id}/edit`
                                      )
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      handleDeleteBuyer(buyer.id, buyer.name)
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
                  </>
                ) : (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listings.map((listing) => (
                        <TableRow
                          key={listing.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(`/marketplace/listings/${listing.id}`)
                          }
                        >
                          <TableCell>
                            <span className="font-medium">{listing.title}</span>
                          </TableCell>
                          <TableCell>
                            {listing.price != null
                              ? new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                }).format(listing.price)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {listing.quantity || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={LISTING_STATUS_COLORS[listing.status] || ''}
                              variant="secondary"
                            >
                              {listing.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {listing.buyer?.name || '—'}
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
                                      router.push(
                                        `/marketplace/listings/${listing.id}/edit`
                                      )
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      handleDeleteListing(
                                        listing.id,
                                        listing.title
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
                  </>
                )}
              </Table>
            </div>
          </Card>

          {currentData?.totalPages && currentData.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={currentData.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Add Buyer Dialog */}
      {!readOnly && (
        <Dialog
          open={showAddBuyer}
          onOpenChange={setShowAddBuyer}
          title="Add Buyer"
        >
          <form onSubmit={handleCreateBuyer} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Buyer name"
                value={buyerForm.name}
                onChange={(e) => {
                  setBuyerForm({ ...buyerForm, name: e.target.value });
                  if (buyerErrors.name) setBuyerErrors({ ...buyerErrors, name: '' });
                }}
              />
              {buyerErrors.name && (
                <p className="text-sm text-destructive mt-1">
                  {buyerErrors.name}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Contact Person
              </label>
              <Input
                placeholder="Contact person"
                value={buyerForm.contactPerson}
                onChange={(e) =>
                  setBuyerForm({ ...buyerForm, contactPerson: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={buyerForm.email}
                  onChange={(e) =>
                    setBuyerForm({ ...buyerForm, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input
                  placeholder="+1 234 567 890"
                  value={buyerForm.phone}
                  onChange={(e) =>
                    setBuyerForm({ ...buyerForm, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select
                options={BUYER_TYPE_OPTIONS}
                value={buyerForm.type}
                onChange={(e) =>
                  setBuyerForm({ ...buyerForm, type: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddBuyer(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create Buyer
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Add Listing Dialog */}
      {!readOnly && (
        <Dialog
          open={showAddListing}
          onOpenChange={setShowAddListing}
          title="Add Listing"
        >
          <form onSubmit={handleCreateListing} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Fresh Tomatoes"
                value={listingForm.title}
                onChange={(e) => {
                  setListingForm({ ...listingForm, title: e.target.value });
                  if (listingErrors.title)
                    setListingErrors({ ...listingErrors, title: '' });
                }}
              />
              {listingErrors.title && (
                <p className="text-sm text-destructive mt-1">
                  {listingErrors.title}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Price</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={listingForm.price}
                  onChange={(e) =>
                    setListingForm({ ...listingForm, price: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Quantity
                </label>
                <Input
                  placeholder="e.g. 100 kg"
                  value={listingForm.quantity}
                  onChange={(e) =>
                    setListingForm({
                      ...listingForm,
                      quantity: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Draft', label: 'Draft' },
                ]}
                value={listingForm.status}
                onChange={(e) =>
                  setListingForm({ ...listingForm, status: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddListing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create Listing
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
