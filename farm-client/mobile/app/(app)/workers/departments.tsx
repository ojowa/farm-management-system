import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MenuButton } from '@/core/ui/MenuButton';
import { departmentsAPI } from '@/modules/finance';
import { Button } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { describeApiError } from '@/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

type Department = {
  id: string;
  name: string;
  description?: string | null;
};

export default function DepartmentsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await departmentsAPI.list();
      setDepartments(response.data || []);
    } catch (e: any) {
      setError(describeApiError(e, 'Could not load departments.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await departmentsAPI.create({ name: name.trim(), description: description.trim() || undefined });
      setShowForm(false);
      setName('');
      setDescription('');
      load();
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to create department.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await departmentsAPI.remove(id);
      load();
    } catch (e: any) {
      setError(describeApiError(e, 'Failed to delete department.'));
    }
  };

  if (loading) return <ScreenLoading message="Loading departments…" />;
  if (error && departments.length === 0)
    return <StateView variant="error" title="Couldn't load departments" message={error} onRetry={load} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg || themeColors.primary }]}>
        <MenuButton />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Departments</Text>
          <Text style={styles.subtitle}>Manage worker departments</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>Departments</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>Organize workers by department</Text>
          </View>
          <TouchableOpacity style={[styles.cardAction]} onPress={() => setShowForm(true)} accessibilityRole="button" accessibilityLabel="Add department">
            <Text style={[styles.cardTitle, { color: themeColors.primary, fontWeight: '700' }]}>+ Add Department</Text>
          </TouchableOpacity>
        </View>
        {departments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyIcon]}>🏢</Text>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>No departments yet</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>Add your first department</Text>
            <Button title="Add Department" onPress={() => setShowForm(true)} />
          </View>
        ) : (
          <FlatList
            data={departments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: themeColors.card }]}
                accessibilityRole="button"
                accessibilityLabel={`Department ${item.name}`}
              >
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: themeColors.text }]}>{item.name}</Text>
                  <Text style={[styles.rowSubtitle, { color: themeColors.textSecondary }]}>{item.description || 'No description'}</Text>
                </View>
                <TouchableOpacity style={[styles.deleteBtn]} onPress={() => handleDelete(item.id)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Delete ${item.name}`}>
                  <Text style={[styles.deleteText, { color: themeColors.error }]}>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>
      {/* Add Department Dialog */}
      {showForm && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
          <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: themeColors.overlay }]} activeOpacity={1} onPress={() => setShowForm(false)}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>Add Department</Text>
                  <TouchableOpacity onPress={() => setShowForm(false)} activeOpacity={0.7}>
                    <Text style={[styles.closeText, { color: themeColors.textSecondary }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Department Name</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Farming"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Description</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="e.g. Crop cultivation and field work"
                    />
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.cancelBtn, { backgroundColor: themeColors.border }]} activeOpacity={0.7}>
                    <Text style={[styles.cancelText, { color: themeColors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: themeColors.primary }]} activeOpacity={0.7} disabled={saving}>
                    <Text style={[styles.saveText, { color: '#FFFFFF' }]}>{saving ? 'Saving…' : 'Add Department'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  headerCopy: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3 },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: { minHeight: 82, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  description: { fontSize: 13 },
  cardAction: { marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(22, 163, 74, 0.1)', borderRadius: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, minHeight: 300 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 13 },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  deleteText: { fontSize: 20 },
  separator: { height: StyleSheet.hairlineWidth },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '55%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeText: { fontSize: 22 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  modalBody: { paddingHorizontal: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveText: { fontSize: 15, fontWeight: '700' },
});
