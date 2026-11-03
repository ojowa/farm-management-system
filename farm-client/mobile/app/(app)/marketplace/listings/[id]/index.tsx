import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { marketplaceAPI } from '@/modules/finance';
import { Button } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

type MarketListing = {
  id: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  price: number;
  quantity: number;
  unit: string;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED';
  listedDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function MarketListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors: themeColors } = useAppTheme();
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await marketplaceAPI.listListings();
      const data = (Array.isArray(response.data) ? response.data : []).find((l: any) => l.id === id);
      setListing(data || null);
      if (!data) setError('Listing not found.');
    } catch (e: any) {
      setError(describeApiError(e, 'Could not load listing.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) return <ScreenLoading message="Loading listing…" />;
  if (error || !listing) return <StateView variant="error" title="Listing not found" message={error || 'Listing not found.'} onRetry={load} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.subtitle}>{listing.entityType}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Listing Details</Text>
            <View style={styles.row}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Type</Text>
              <Text style={[styles.fieldValue, { color: themeColors.text }]}>{listing.entityType}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Status</Text>
              <Text style={[styles.statusBadge, { color: themeColors.text }]}>{listing.status}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Price</Text>
              <Text style={[styles.fieldValue, { color: themeColors.text, fontWeight: '700' }]}>{formatCurrency(listing.price)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Quantity</Text>
              <Text style={[styles.fieldValue, { color: themeColors.text }]}>{listing.quantity} {listing.unit}</Text>
            </View>
            {listing.listedDate && (
              <View style={styles.row}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Listed Date</Text>
                <Text style={[styles.fieldValue, { color: themeColors.text }]}>{new Date(listing.listedDate).toLocaleDateString()}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.push(`/marketplace/listings/${listing.id}/edit`)} style={[styles.editBtn, { backgroundColor: themeColors.primary }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Edit listing">
            <Text style={[styles.editBtnText, { color: '#FFFFFF' }]}>Edit Listing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  headerCopy: { flex: 1 },
  backText: { color: '#FFFFFF', fontSize: 24 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3 },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, elevation: 2, shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fieldLabel: { fontSize: 13 },
  fieldValue: { fontSize: 15, fontWeight: '600' },
  statusBadge: { fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  editBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  editBtnText: { fontSize: 15, fontWeight: '700' },
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
