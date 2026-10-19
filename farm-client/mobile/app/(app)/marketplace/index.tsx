import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { marketplaceAPI } from '@/modules/finance';
import type { Buyer, MarketListing } from '@/modules/finance';
import { Card, Button, TextInputField, Modal, colors } from '@/core/ui/UIComponents';
import { SelectField, SelectOption } from '@/core/ui/SelectField';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { describeApiError } from '@/core/utils/apiError';
import { MenuButton } from '@/core/ui/MenuButton';
import { useAppTheme } from '@/core/theme/ThemeContext';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  segmentButton: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentButtonActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  segmentTextActive: { color: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  searchInput: { marginBottom: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterButtonText: { fontSize: 12, color: colors.textLight },
  filterButtonTextActive: { color: '#FFFFFF' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 300,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginBottom: 20, textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  badge: { backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  priceText: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  metaText: { fontSize: 12, color: colors.textLight },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.error, borderRadius: 6 },
  deleteButtonText: { color: colors.error, fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalActionButton: { flex: 1 },
});

const ENTITY_TYPE_OPTIONS: SelectOption[] = [
  { id: 'crop', label: 'Crop' },
  { id: 'livestock', label: 'Livestock' },
  { id: 'poultry', label: 'Poultry' },
];
const BUYER_TYPE_OPTIONS: SelectOption[] = [
  { id: 'INDIVIDUAL', label: 'Individual' },
  { id: 'COMPANY', label: 'Company' },
  { id: 'COOPERATIVE', label: 'Cooperative' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Buyers may carry extra fields the mobile type doesn't model yet
 * (type/contactPerson exist in the DB) — read both shapes.
 */
interface BuyerRecord extends Buyer {
  type?: string;
  contactPerson?: string;
}

function unwrapList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function ListingCard({
  item,
  canDelete,
  onDelete,
}: {
  item: MarketListing;
  canDelete: boolean;
  onDelete: (item: MarketListing) => void;
}) {
  const { colors: tc, isDark } = useAppTheme();
  const status = (item as any).status as string | undefined;
  const listedDate = (item as any).listedDate as string | undefined;
  return (
    <Card style={[styles.card, { backgroundColor: tc.card, borderColor: isDark ? tc.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
      <View style={styles.topRow}>
        <Text style={[styles.cardTitle, { color: tc.text }]}>{item.title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.entityType || '—'}</Text>
        </View>
        {!!status && (
          <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
            <Text style={[styles.badgeText, { color: '#6B7280' }]}>{status}</Text>
          </View>
        )}
      </View>
      <Text style={styles.priceText}>
        {Number(item.price).toLocaleString()} / {item.unit || 'unit'}
      </Text>
      <Text style={[styles.metaText, { color: tc.textSecondary }]}>
        {Number(item.quantity).toLocaleString()} {item.unit || 'units'} available
        {formatDate(listedDate ?? item.createdAt) ? ` · Listed ${formatDate(listedDate ?? item.createdAt)}` : ''}
      </Text>
      {canDelete && (
        <View style={[styles.cardFooter, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={`Delete listing ${item.title}`}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

function BuyerCard({
  item,
  canDelete,
  onDelete,
}: {
  item: BuyerRecord;
  canDelete: boolean;
  onDelete: (item: BuyerRecord) => void;
}) {
  const { colors: tc, isDark } = useAppTheme();
  const contact = [item.email, item.phone].filter(Boolean).join(' · ');
  return (
    <Card style={[styles.card, { backgroundColor: tc.card, borderColor: isDark ? tc.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
      <View style={styles.topRow}>
        <Text style={[styles.cardTitle, { color: tc.text }]}>{item.name}</Text>
        {!!item.type && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.type}</Text>
          </View>
        )}
      </View>
      {!!item.contactPerson && <Text style={[styles.metaText, { color: tc.textSecondary }]}>Contact: {item.contactPerson}</Text>}
      {!!contact && <Text style={[styles.metaText, { color: tc.textSecondary }]}>{contact}</Text>}
      {!!item.address && <Text style={[styles.metaText, { color: tc.textSecondary }]}>{item.address}</Text>}
      {canDelete && (
        <View style={[styles.cardFooter, { borderTopColor: isDark ? tc.surface : '#F5F5F5' }]}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={`Delete buyer ${item.name}`}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

export default function MarketplaceScreen() {
  const { success, error: showError } = useToasts();
  const { hasPermission } = usePermission();
  const { colors: tc, isDark } = useAppTheme();

  const dynamicStyles = {
    container: { backgroundColor: tc.background },
    segmentRow: { backgroundColor: tc.card, borderColor: tc.border },
    segmentText: { color: tc.textSecondary },
    filterButton: { backgroundColor: tc.card, borderColor: tc.border },
    filterButtonText: { color: tc.textSecondary },
    emptyText: { color: tc.text },
    emptySubtext: { color: tc.textSecondary },
  };

  // Server: GET /marketplace/* is finance.read; writes finance.write/delete.
  const canWrite = hasPermission('finance.write');
  const canDelete = hasPermission('finance.delete');

  const [segment, setSegment] = useState<'listings' | 'buyers'>('listings');

  const [listings, setListings] = useState<MarketListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [listingSearch, setListingSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [buyers, setBuyers] = useState<BuyerRecord[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(true);
  const [buyersError, setBuyersError] = useState<string | null>(null);
  const [buyerSearch, setBuyerSearch] = useState('');

  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);
  const [listingForm, setListingForm] = useState({
    title: '',
    price: '',
    quantity: '',
    unit: 'kg',
    entityType: 'crop',
    listedDate: today(),
  });
  const [listingErrors, setListingErrors] = useState<Record<string, string | undefined>>({});

  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [creatingBuyer, setCreatingBuyer] = useState(false);
  const [buyerForm, setBuyerForm] = useState({
    name: '',
    type: 'INDIVIDUAL',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });
  const [buyerNameError, setBuyerNameError] = useState<string | undefined>();

  useEffect(() => {
    loadListings();
    loadBuyers();
  }, []);

  const loadListings = async () => {
    try {
      setListingsError(null);
      const response = await marketplaceAPI.listListings();
      setListings(unwrapList<MarketListing>(response.data));
    } catch (error: any) {
      setListingsError(describeApiError(error, "Couldn't load listings."));
    } finally {
      setListingsLoading(false);
    }
  };

  const loadBuyers = async () => {
    try {
      setBuyersError(null);
      const response = await marketplaceAPI.listBuyers();
      setBuyers(unwrapList<BuyerRecord>(response.data));
    } catch (error: any) {
      setBuyersError(describeApiError(error, "Couldn't load buyers."));
    } finally {
      setBuyersLoading(false);
    }
  };

  // Statuses vary across server versions — build the chips from real data.
  const statusFilters = useMemo(() => {
    const distinct = Array.from(
      new Set(listings.map((l) => (l as any).status as string | undefined).filter(Boolean))
    );
    return ['all', ...distinct] as string[];
  }, [listings]);

  const filteredListings = useMemo(() => {
    const query = listingSearch.trim().toLowerCase();
    return listings.filter((l) => {
      if (statusFilter !== 'all' && (l as any).status !== statusFilter) return false;
      if (query && !`${l.title} ${l.entityType}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [listings, listingSearch, statusFilter]);

  const filteredBuyers = useMemo(() => {
    const query = buyerSearch.trim().toLowerCase();
    if (!query) return buyers;
    return buyers.filter((b) =>
      `${b.name} ${b.contactPerson ?? ''} ${b.email ?? ''}`.toLowerCase().includes(query)
    );
  }, [buyers, buyerSearch]);

  const validateListing = (): boolean => {
    const errors: Record<string, string | undefined> = {};
    if (!listingForm.title.trim()) errors.title = 'Title is required';
    const price = Number(listingForm.price);
    if (!listingForm.price.trim() || isNaN(price) || price <= 0) errors.price = 'Enter a valid price';
    const quantity = Number(listingForm.quantity);
    if (!listingForm.quantity.trim() || isNaN(quantity) || quantity <= 0)
      errors.quantity = 'Enter a valid quantity';
    if (
      !listingForm.listedDate.trim() ||
      !DATE_RE.test(listingForm.listedDate.trim()) ||
      isNaN(Date.parse(listingForm.listedDate.trim()))
    )
      errors.listedDate = 'Use YYYY-MM-DD';
    setListingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitListing = async () => {
    if (!validateListing()) return;
    setCreatingListing(true);
    try {
      await marketplaceAPI.createListing({
        title: listingForm.title.trim(),
        price: Number(listingForm.price),
        quantity: Number(listingForm.quantity),
        unit: listingForm.unit.trim() || 'kg',
        entityType: listingForm.entityType,
        listedDate: listingForm.listedDate.trim(),
      });
      success('Listing created successfully');
      setListingModalOpen(false);
      setListingForm((prev) => ({ ...prev, title: '', price: '', quantity: '', listedDate: today() }));
      loadListings();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to create listing. Please try again.'));
    } finally {
      setCreatingListing(false);
    }
  };

  const submitBuyer = async () => {
    if (!buyerForm.name.trim()) {
      setBuyerNameError('Buyer name is required');
      return;
    }
    setCreatingBuyer(true);
    try {
      await marketplaceAPI.createBuyer({
        name: buyerForm.name.trim(),
        type: buyerForm.type,
        contactPerson: buyerForm.contactPerson.trim() || undefined,
        email: buyerForm.email.trim() || undefined,
        phone: buyerForm.phone.trim() || undefined,
        address: buyerForm.address.trim() || undefined,
      });
      success('Buyer created successfully');
      setBuyerModalOpen(false);
      setBuyerForm((prev) => ({ ...prev, name: '', contactPerson: '', email: '', phone: '', address: '' }));
      loadBuyers();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to create buyer. Please try again.'));
    } finally {
      setCreatingBuyer(false);
    }
  };

  const deleteListing = useCallback(
    (item: MarketListing) => {
      Alert.alert('Delete Listing', `Delete "${item.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await marketplaceAPI.deleteListing(item.id);
              success('Listing deleted');
              loadListings();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to delete listing.'));
            }
          },
        },
      ]);
    },
    [success, showError]
  );

  const deleteBuyer = useCallback(
    (item: BuyerRecord) => {
      Alert.alert('Delete Buyer', `Delete "${item.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await marketplaceAPI.deleteBuyer(item.id);
              success('Buyer deleted');
              loadBuyers();
            } catch (error: any) {
              showError(describeApiError(error, 'Failed to delete buyer.'));
            }
          },
        },
      ]);
    },
    [success, showError]
  );

  const updateListingForm = (field: string, value: string) => {
    setListingForm((prev) => ({ ...prev, [field]: value }));
    if (listingErrors[field]) setListingErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const openAdd = () => {
    if (segment === 'listings') setListingModalOpen(true);
    else setBuyerModalOpen(true);
  };

  const renderHeader = () => (
    <>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <MenuButton />
        <Text style={styles.headerTitle}>Marketplace</Text>
        {canWrite && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAdd}
            accessibilityRole="button"
            accessibilityLabel={segment === 'listings' ? 'Create new listing' : 'Create new buyer'}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.segmentRow, dynamicStyles.segmentRow]}>
        <TouchableOpacity
          style={[styles.segmentButton, segment === 'listings' && styles.segmentButtonActive]}
          onPress={() => setSegment('listings')}
          accessibilityRole="tab"
          accessibilityLabel="Show listings"
          accessibilityState={{ selected: segment === 'listings' }}
        >
          <Text style={[styles.segmentText, dynamicStyles.segmentText, segment === 'listings' && styles.segmentTextActive]}>
            Listings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, segment === 'buyers' && styles.segmentButtonActive]}
          onPress={() => setSegment('buyers')}
          accessibilityRole="tab"
          accessibilityLabel="Show buyers"
          accessibilityState={{ selected: segment === 'buyers' }}
        >
          <Text style={[styles.segmentText, dynamicStyles.segmentText, segment === 'buyers' && styles.segmentTextActive]}>Buyers</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (listingsLoading && buyersLoading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        {renderHeader()}
        <ScreenLoading message="Loading marketplace…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {renderHeader()}

      {segment === 'listings' ? (
        listingsError ? (
          <StateView
            variant="error"
            title="Couldn't load listings"
            message={listingsError}
            onRetry={loadListings}
            retryLabel="Retry"
          />
        ) : (
          <>
            <View style={styles.content}>
              <TextInputField
                placeholder="Search listings…"
                value={listingSearch}
                onChangeText={setListingSearch}
                returnKeyType="search"
                containerStyle={styles.searchInput}
                accessibilityLabel="Search listings"
              />
              <View style={styles.filterRow}>
                {statusFilters.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterButton, dynamicStyles.filterButton, statusFilter === f && styles.filterButtonActive]}
                    onPress={() => setStatusFilter(f)}
                    accessibilityRole="button"
                    accessibilityLabel={f === 'all' ? 'Filter all listings' : `Filter ${f.toLowerCase()} listings`}
                    accessibilityState={{ selected: statusFilter === f }}
                  >
                    <Text style={[styles.filterButtonText, dynamicStyles.filterButtonText, statusFilter === f && styles.filterButtonTextActive]}>
                      {f === 'all' ? 'All' : f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <FlatList
              data={filteredListings}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <ListingCard item={item} canDelete={canDelete} onDelete={deleteListing} />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🛒</Text>
                  <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No Listings Found</Text>
                  <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
                    {listingSearch || statusFilter !== 'all'
                      ? 'Nothing matches the current filters'
                      : 'List your crops, livestock or poultry produce for sale'}
                  </Text>
                  {!listingSearch && statusFilter === 'all' && canWrite && (
                    <Button
                      title="New Listing"
                      onPress={() => setListingModalOpen(true)}
                      accessibilityLabel="Create your first listing"
                    />
                  )}
                </View>
              }
            />
          </>
        )
      ) : buyersError ? (
        <StateView
          variant="error"
          title="Couldn't load buyers"
          message={buyersError}
          onRetry={loadBuyers}
          retryLabel="Retry"
        />
      ) : (
        <>
          <View style={styles.content}>
            <TextInputField
              placeholder="Search buyers…"
              value={buyerSearch}
              onChangeText={setBuyerSearch}
              returnKeyType="search"
              containerStyle={styles.searchInput}
              accessibilityLabel="Search buyers"
            />
          </View>
          <FlatList
            data={filteredBuyers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => <BuyerCard item={item} canDelete={canDelete} onDelete={deleteBuyer} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🤝</Text>
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No Buyers Found</Text>
                <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>
                  {buyerSearch ? 'Nothing matches the current search' : 'Add the buyers you sell produce to'}
                </Text>
                {!buyerSearch && canWrite && (
                  <Button
                    title="New Buyer"
                    onPress={() => setBuyerModalOpen(true)}
                    accessibilityLabel="Add your first buyer"
                  />
                )}
              </View>
            }
          />
        </>
      )}

      <Modal
        visible={listingModalOpen}
        onClose={() => {
          setListingModalOpen(false);
          setListingErrors({});
        }}
        title="New Listing"
      >
        <TextInputField
          label="Title *"
          placeholder="e.g. Fresh maize — Grade A"
          value={listingForm.title}
          onChangeText={(v) => updateListingForm('title', v)}
          error={listingErrors.title}
        />
        <SelectField
          label="Product Type"
          placeholder="Select a product type"
          value={listingForm.entityType}
          options={ENTITY_TYPE_OPTIONS}
          onSelect={(v) => updateListingForm('entityType', v)}
        />
        <TextInputField
          label="Price *"
          placeholder="Price per unit"
          value={listingForm.price}
          onChangeText={(v) => updateListingForm('price', v)}
          keyboardType="numeric"
          error={listingErrors.price}
        />
        <TextInputField
          label="Quantity *"
          placeholder="e.g. 500"
          value={listingForm.quantity}
          onChangeText={(v) => updateListingForm('quantity', v)}
          keyboardType="numeric"
          error={listingErrors.quantity}
        />
        <TextInputField
          label="Unit"
          placeholder="kg"
          value={listingForm.unit}
          onChangeText={(v) => updateListingForm('unit', v)}
        />
        <TextInputField
          label="Listed Date *"
          placeholder="YYYY-MM-DD"
          value={listingForm.listedDate}
          onChangeText={(v) => updateListingForm('listedDate', v)}
          error={listingErrors.listedDate}
        />
        <View style={styles.modalActions}>
          <Button
            title="Cancel"
            variant="secondary"
            style={styles.modalActionButton}
            onPress={() => {
              setListingModalOpen(false);
              setListingErrors({});
            }}
          />
          <Button
            title="Create Listing"
            style={styles.modalActionButton}
            loading={creatingListing}
            disabled={creatingListing}
            onPress={submitListing}
          />
        </View>
      </Modal>

      <Modal
        visible={buyerModalOpen}
        onClose={() => {
          setBuyerModalOpen(false);
          setBuyerNameError(undefined);
        }}
        title="New Buyer"
      >
        <TextInputField
          label="Name *"
          placeholder="e.g. Green Grocers Ltd"
          value={buyerForm.name}
          onChangeText={(v) => {
            setBuyerForm((prev) => ({ ...prev, name: v }));
            if (buyerNameError) setBuyerNameError(undefined);
          }}
          error={buyerNameError}
        />
        <SelectField
          label="Buyer Type"
          placeholder="Select a buyer type"
          value={buyerForm.type}
          options={BUYER_TYPE_OPTIONS}
          onSelect={(v) => setBuyerForm((prev) => ({ ...prev, type: v }))}
        />
        <TextInputField
          label="Contact Person"
          placeholder="e.g. Jane Doe"
          value={buyerForm.contactPerson}
          onChangeText={(v) => setBuyerForm((prev) => ({ ...prev, contactPerson: v }))}
        />
        <TextInputField
          label="Email"
          placeholder="buyer@example.com"
          value={buyerForm.email}
          onChangeText={(v) => setBuyerForm((prev) => ({ ...prev, email: v }))}
          keyboardType="email-address"
        />
        <TextInputField
          label="Phone"
          placeholder="+1 555 0100"
          value={buyerForm.phone}
          onChangeText={(v) => setBuyerForm((prev) => ({ ...prev, phone: v }))}
          keyboardType="phone-pad"
        />
        <TextInputField
          label="Address"
          placeholder="Physical address"
          value={buyerForm.address}
          onChangeText={(v) => setBuyerForm((prev) => ({ ...prev, address: v }))}
        />
        <View style={styles.modalActions}>
          <Button
            title="Cancel"
            variant="secondary"
            style={styles.modalActionButton}
            onPress={() => {
              setBuyerModalOpen(false);
              setBuyerNameError(undefined);
            }}
          />
          <Button
            title="Add Buyer"
            style={styles.modalActionButton}
            loading={creatingBuyer}
            disabled={creatingBuyer}
            onPress={submitBuyer}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
