import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { pestDiseaseAPI } from '@/modules/crop';
import { unwrapList } from '@/core/utils/listPayload';
import { Card } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { MenuButton } from '@/core/ui/MenuButton';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

interface PestDiseaseRecord {
  id: string;
  type?: string;
  name?: string;
  cropName?: string;
  severity?: string;
  affectedArea?: string;
  identifiedDate?: string;
  treatment?: string;
  status?: string;
  notes?: string;
}

function formatDate(value?: string): string {
  if (!value) return 'Date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function CropPestDiseaseScreen() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const { colors: themeColors } = useAppTheme();
  const [records, setRecords] = useState<PestDiseaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await pestDiseaseAPI.list(farmId ? { farmId } : undefined);
      setRecords(unwrapList<PestDiseaseRecord>(response.data));
    } catch (error) {
      setLoadError(describeApiError(error, 'Failed to load pest and disease records.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <ScreenLoading message="Loading pest and disease records…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Header />
        <StateView
          variant="error"
          title="Couldn't load pest and disease records"
          message={loadError}
          onRetry={() => void loadRecords()}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Header />
      <FlatList
        data={records}
        keyExtractor={(record) => record.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadRecords();
            }}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: themeColors.textSecondary }]}>
            No pest or disease records have been added.
          </Text>
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: themeColors.card }]}>
            <View style={styles.heading}>
              <Text style={[styles.recordName, { color: themeColors.text }]}>{item.name || item.type || 'Crop issue'}</Text>
              {!!item.severity && (
                <Text style={[styles.severity, { color: themeColors.primary }]}>{item.severity}</Text>
              )}
            </View>
            <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
              {[item.type, item.cropName, formatDate(item.identifiedDate)].filter(Boolean).join(' · ')}
            </Text>
            {!!item.affectedArea && (
              <Text style={[styles.meta, { color: themeColors.textSecondary }]}>Affected area: {item.affectedArea}</Text>
            )}
            {!!item.status && (
              <Text style={[styles.meta, { color: themeColors.textSecondary }]}>Status: {item.status}</Text>
            )}
            {!!item.treatment && <Text style={[styles.notes, { color: themeColors.text }]}>Treatment: {item.treatment}</Text>}
            {!!item.notes && <Text style={[styles.notes, { color: themeColors.textSecondary }]}>{item.notes}</Text>}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function Header() {
  const router = useRouter();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back to crops"
        onPress={() =>
          router.push(farmId ? (`/crops?farmId=${encodeURIComponent(farmId)}` as never) : '/crops')
        }
      >
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <MenuButton />
      <Text style={styles.headerTitle}>Pest &amp; Disease</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: { padding: 15 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  recordName: { fontSize: 16, fontWeight: '700', flex: 1 },
  severity: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 5 },
  notes: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  empty: { textAlign: 'center', paddingVertical: 40 },
});
