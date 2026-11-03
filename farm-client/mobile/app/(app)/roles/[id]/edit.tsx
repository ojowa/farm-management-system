import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { orgAdminAPI } from '@/modules/settings';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { ScreenLoading, StateView } from '@/core/ui/feedback';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { describeApiError } from '@/core/utils/apiError';

type Role = { id: string; name: string; description?: string | null; organizationId?: string | null };
function unwrapRole(payload: any): Role | null {
  if (payload?.id) return payload as Role;
  if (payload?.data?.id) return payload.data as Role;
  return null;
}

export default function EditRoleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const { colors: tc } = useAppTheme();
  const canManage = hasPermission('organization.manage');
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRole = async () => {
    try {
      setLoadError(null);
      const response = await orgAdminAPI.getRole(id);
      const data = unwrapRole(response.data);
      if (!data) {
        setLoadError('Role not found.');
        return;
      }
      setRole(data);
      setName(data.name);
      setDescription(data.description || '');
    } catch (error) {
      setLoadError(describeApiError(error, "Couldn't load this role."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRole(); }, [id]);

  const submit = async () => {
    if (!canManage) {
      showError('You do not have permission to manage roles.');
      return;
    }
    if (!role?.organizationId) {
      showError('System roles cannot be edited.');
      return;
    }
    if (!name.trim()) {
      showError('Role name is required.');
      return;
    }
    setSaving(true);
    try {
      await orgAdminAPI.updateRole(role.id, { name: name.trim(), description: description.trim() || undefined });
      success('Role updated successfully');
      router.replace(`/roles/${role.id}`);
    } catch (error) {
      showError(describeApiError(error, 'Failed to update role.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenLoading message="Loading role…" />;
  if (loadError || !role) return <StateView variant="error" title="Couldn't load this role" message={loadError || 'Role not found.'} onRetry={loadRole} />;
  if (!canManage || !role.organizationId) {
    return <StateView variant="error" title="Role cannot be edited" message={!canManage ? 'You need organization management permission to edit roles.' : 'System roles are managed by the platform.'} onRetry={() => router.replace(`/roles/${role.id}`)} retryLabel="Back to role" />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to role"><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Role</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={[styles.card, { backgroundColor: tc.card }]}>
          <TextInputField label="Role name *" value={name} onChangeText={setName} placeholder="e.g. Farm Supervisor" />
          <TextInputField label="Description" value={description} onChangeText={setDescription} placeholder="What this role is for" />
          <Text style={[styles.hint, { color: tc.textSecondary }]}>Manage this role's permissions from the role details page.</Text>
          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" style={styles.actionButton} onPress={() => router.back()} />
            <Button title="Save Changes" style={styles.actionButton} loading={saving} onPress={submit} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 18 },
  back: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32 },
  card: { padding: 16 },
  hint: { marginBottom: 16, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1 },
});
