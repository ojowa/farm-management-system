import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const STATUSES = ['ACTIVE', 'SOLD', 'CANCELLED'] as const;

export default function MarketListingEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors: themeColors } = useAppTheme();
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    entityType: '',
    price: '',
    quantity: '',
    unit: '',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await marketplaceAPI.listListings();
      const data = (Array.isArray(response.data) ? response.data : []).find((l: any) => l.id === id);
      if (!data) {
        setError('Listing not found.');
        return;
      }
      setListing(data);
      setFormData({
        title: data.title,
        entityType: data.entityType,
        price: (data.price || 0).toString(),
        quantity: (data.quantity || 0).toString(),
        unit: data.unit || '',
        status: data.status,
      });
    } catch (e: any) {
      setError(describeApiError(e, 'Could not load listing.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.entityType || !formData.price || !formData.unit) return;
    setSaving(true);
    try {
      await marketplaceAPI.updateListing(id as string, {
        title: formData.title.trim(),
        entityType: formData.entityType,
        price: Number(formData.price),
        quantity: Number(formData.quantity),
        unit: formData.unit.trim(),
        status: formData.status as 'ACTIVE' | 'SOLD' | 'CANCELLED',
      });
      router.push(`/marketplace/listings/${id}`);
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to update listing.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await marketplaceAPI.deleteListing(id as string);
      router.push('/marketplace');
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to delete listing.'));
    }
  };

  if (loading) return <ScreenLoading message="Loading listing…" />;
  if (error) return <StateView variant="error" title="Couldn't load listing" message={error} onRetry={load} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Edit Listing</Text>
          <Text style={styles.subtitle}>Edit marketplace listing details</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Listing Details</Text>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Title</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                value={formData.title}
                onChangeText={(v) => setFormData({ ...formData, title: v })}
                placeholder="e.g. Fresh Tomatoes"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Entity Type</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                value={formData.entityType}
                onChangeText={(v) => setFormData({ ...formData, entityType: v })}
                placeholder="e.g. crop"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Unit</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                value={formData.unit}
                onChangeText={(v) => setFormData({ ...formData, unit: v })}
                placeholder="e.g. kg"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Price</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                keyboardType="numeric"
                value={formData.price}
                onChangeText={(v) => setFormData({ ...formData, price: v })}
                placeholder="0.00"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Quantity</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                keyboardType="numeric"
                value={formData.quantity}
                onChangeText={(v) => setFormData({ ...formData, quantity: v })}
                placeholder="0"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Status</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                value={formData.status}
                onChangeText={(v) => setFormData({ ...formData, status: v })}
                placeholder="e.g. ACTIVE"
              />
            </View>
            <View style={[styles.actions, { backgroundColor: themeColors.card }]}>
              <TouchableOpacity onPress={() => router.back()} style={[styles.cancelBtn, { backgroundColor: themeColors.border }]} activeOpacity={0.7}>
                <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: themeColors.primary }]} activeOpacity={0.7} disabled={saving}>
                <Text style={[styles.saveText, { color: '#FFFFFF' }]}>{saving ? 'Saving…' : 'Save Listing'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveText: { fontSize: 15, fontWeight: '700' },
});
