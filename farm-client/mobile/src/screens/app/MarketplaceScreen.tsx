import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, colors } from '../../components/common/UIComponents';
import { ScreenLoading, StateView } from '../../components/feedback';
import { marketplaceAPI } from '../../services/api';
import { describeApiError } from '../../utils/apiError';
import { extractArray } from '../../utils/responseParser';

interface Buyer {
  id: string;
  name: string;
  location: string;
  products: string[];
  rating?: number;
}

interface Listing {
  id: string;
  title: string;
  crop: string;
  quantity: string;
  price: string;
  status: string;
  seller: string;
}

type Tab = 'listings' | 'buyers';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  tabActive: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  tabInactive: { backgroundColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)' },
  tabTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  card: { marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  cardDetail: { fontSize: 13, color: colors.textLight, marginBottom: 2 },
  productsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  productTag: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  productTagText: { fontSize: 11, color: '#166534' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start', marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: colors.textLight },
});

const keyExtractor = (item: Buyer | Listing) => item.id;

export default function MarketplaceScreen() {
  const [tab, setTab] = useState<Tab>('listings');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoadError(null);
      const [buyersRes, listingsRes] = await Promise.all([
        marketplaceAPI.listBuyers().catch(() => ({ data: [] })),
        marketplaceAPI.listListings().catch(() => ({ data: [] })),
      ]);
      setBuyers(extractArray<Buyer>(buyersRes));
      setListings(extractArray<Listing>(listingsRes));
    } catch (error: any) {
      setLoadError(describeApiError(error, 'Failed to load marketplace.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  const renderEmpty = (type: string) => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{type === 'buyers' ? '🏪' : '🌾'}</Text>
      <Text style={styles.emptyText}>No {type} found</Text>
      <Text style={styles.emptySubtext}>Check back later</Text>
    </View>
  );

  const renderBuyer = useCallback(({ item }: { item: Buyer }) => (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardDetail}>{item.location}</Text>
      {item.rating !== undefined && (
        <Text style={styles.cardDetail}>Rating: {item.rating}/5</Text>
      )}
      {item.products && item.products.length > 0 && (
        <View style={styles.productsRow}>
          {item.products.map((p, i) => (
            <View key={i} style={styles.productTag}>
              <Text style={styles.productTagText}>{p}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  ), []);

  const renderListing = useCallback(({ item }: { item: Listing }) => (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDetail}>Crop: {item.crop}</Text>
      <Text style={styles.cardDetail}>Quantity: {item.quantity}</Text>
      <Text style={styles.cardDetail}>Price: {item.price}</Text>
      <Text style={styles.cardDetail}>Seller: {item.seller}</Text>
      <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
        <Text style={[styles.badgeText, { color: '#166534' }]}>{item.status}</Text>
      </View>
    </Card>
  ), []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Marketplace</Text>
        </View>
        <ScreenLoading message="Loading marketplace..." />
      </SafeAreaView>
    );
  }

  if (loadError && buyers.length === 0 && listings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Marketplace</Text>
        </View>
        <StateView
          variant="error"
          title="Couldn't load marketplace"
          message={loadError}
          onRetry={fetchData}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const data = tab === 'buyers' ? buyers : listings;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'listings' ? styles.tabActive : styles.tabInactive]}
            onPress={() => setTab('listings')}
          >
            <Text style={[styles.tabText, tab === 'listings' && styles.tabTextActive]}>Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'buyers' ? styles.tabActive : styles.tabInactive]}
            onPress={() => setTab('buyers')}
          >
            <Text style={[styles.tabText, tab === 'buyers' && styles.tabTextActive]}>Buyers</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={data as any[]}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => renderEmpty(tab)}
        renderItem={tab === 'buyers' ? (renderBuyer as any) : (renderListing as any)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
