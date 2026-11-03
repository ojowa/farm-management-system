import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { farmsAPI } from '@/modules/farm';
import { reportsAPI } from '@/modules/reporting';
import { Button, Card, TextInputField } from '@/core/ui/UIComponents';
import { SelectField, SelectOption } from '@/core/ui/SelectField';
import { usePermission } from '@/core/hooks/usePermission';
import { useToasts } from '@/core/hooks/useToasts';
import { useAppTheme } from '@/core/theme/ThemeContext';
import { describeApiError } from '@/core/utils/apiError';
import { unwrapList } from '@/core/utils/listPayload';
import { ScreenLoading } from '@/core/ui/feedback';

type DataSource = 'farms' | 'crops' | 'livestock' | 'poultry' | 'inventory' | 'workers' | 'finance';
type WidgetType = 'table' | 'bar' | 'line' | 'pie' | 'stat';
type Widget = { id: string; type: WidgetType; title: string; dataSource: DataSource; fields: string[]; aggregation?: string; aggregateField?: string };
const sourceFields: Record<DataSource, string[]> = {
  farms: ['name', 'location', 'size', 'status', 'createdAt'],
  crops: ['name', 'cropType', 'area', 'status', 'createdAt'],
  livestock: ['species', 'breed', 'gender', 'status', 'birthDate'],
  poultry: ['batchCode', 'birdCount', 'breed', 'status', 'arrivalDate'],
  inventory: ['name', 'category', 'quantity', 'unit', 'createdAt'],
  workers: ['name', 'role', 'createdAt'],
  finance: ['title', 'amount', 'date', 'type'],
};
const sources: SelectOption[] = Object.keys(sourceFields).map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) }));
const widgetTypes: SelectOption[] = [
  { id: 'table', label: 'Data Table' },
  { id: 'stat', label: 'Stat Card' },
  { id: 'bar', label: 'Bar Chart' },
  { id: 'line', label: 'Line Chart' },
  { id: 'pie', label: 'Pie Chart' },
];
const aggregations: SelectOption[] = ['count', 'sum', 'avg', 'min', 'max'].map((id) => ({ id, label: id.toUpperCase() }));

export default function ReportBuilderScreen() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const { success, error: showError } = useToasts();
  const { colors: tc } = useAppTheme();
  const [name, setName] = useState('');
  const [farmId, setFarmId] = useState('');
  const [farms, setFarms] = useState<SelectOption[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [farmLoadError, setFarmLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    farmsAPI.list({ limit: 100 }).then((response) => {
      if (!active) return;
      const rows = unwrapList<{ id: string; name: string }>(response.data);
      setFarms(rows.map((farm) => ({ id: farm.id, label: farm.name })));
    }).catch((error) => {
      if (active) setFarmLoadError(describeApiError(error, 'Could not load farms.'));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const selected = useMemo(() => widgets.find((widget) => widget.id === selectedId), [widgets, selectedId]);
  const addWidget = (type: WidgetType) => {
    const widget: Widget = {
      id: `${Date.now()}-${widgets.length}`,
      type,
      title: `New ${type[0].toUpperCase()}${type.slice(1)} Widget`,
      dataSource: 'farms',
      fields: ['name'],
    };
    setWidgets((prev) => [...prev, widget]);
    setSelectedId(widget.id);
    setPreview(false);
  };
  const updateWidget = (updates: Partial<Widget>) => {
    if (!selectedId) return;
    setWidgets((prev) => prev.map((widget) => widget.id === selectedId ? { ...widget, ...updates } : widget));
  };
  const toggleField = (field: string) => {
    if (!selected) return;
    const fields = selected.fields.includes(field)
      ? selected.fields.filter((value) => value !== field)
      : [...selected.fields, field];
    updateWidget({ fields });
  };
  const save = async () => {
    if (!hasPermission('reporting.write')) {
      showError('You do not have permission to save reports.');
      return;
    }
    if (!name.trim()) {
      showError('Report name is required.');
      return;
    }
    if (!farmId) {
      showError('Select a farm for this report.');
      return;
    }
    if (!widgets.length) {
      showError('Add at least one widget before saving.');
      return;
    }
    if (widgets.some((widget) => !widget.title.trim() || !widget.fields.length)) {
      showError('Each widget needs a title and at least one field.');
      return;
    }
    setSaving(true);
    try {
      await reportsAPI.create({
        farmId,
        title: name.trim(),
        status: 'draft',
        parameters: { kind: 'custom', widgets },
      });
      success('Report saved successfully');
      router.replace('/reports/list');
    } catch (error) {
      showError(describeApiError(error, 'Failed to save report.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenLoading message="Loading report builder…" />;
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to reports"><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Custom Report Builder</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={[styles.card, { backgroundColor: tc.card }]}>
          <TextInputField label="Report name *" placeholder="My custom report" value={name} onChangeText={setName} />
          {farmLoadError ? <Text style={[styles.error, { color: tc.error }]}>{farmLoadError}</Text> : (
            <SelectField label="Farm *" placeholder="Select a farm" value={farmId} options={farms} onSelect={setFarmId} />
          )}
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Add widgets</Text>
          <View style={styles.widgetTypes}>
            {widgetTypes.map((option) => (
              <TouchableOpacity key={option.id} style={[styles.typeButton, { borderColor: tc.border, backgroundColor: tc.surface }]} onPress={() => addWidget(option.id as WidgetType)} accessibilityRole="button">
                <Text style={{ color: tc.text }}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={[styles.card, { backgroundColor: tc.card }]}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Report canvas ({widgets.length})</Text>
          {!widgets.length ? <Text style={{ color: tc.textSecondary }}>Add a widget to start building your report.</Text> : widgets.map((widget) => (
            <View key={widget.id} style={[styles.widgetRow, { borderColor: tc.border }]}>
              <TouchableOpacity style={styles.widgetLabel} onPress={() => { setSelectedId(widget.id); setPreview(false); }} accessibilityRole="button">
                <Text style={{ color: tc.text, fontWeight: '600' }}>{widget.title}</Text>
                <Text style={{ color: tc.textSecondary }}>{widget.dataSource} · {widget.type} · {widget.fields.length} fields</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setWidgets((prev) => prev.filter((item) => item.id !== widget.id));
                if (selectedId === widget.id) setSelectedId(null);
              }} accessibilityRole="button" accessibilityLabel={`Remove ${widget.title}`}>
                <Text style={{ color: tc.error, fontWeight: '700' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
          {selected && !preview && (
            <View style={styles.config}>
              <Text style={[styles.sectionTitle, { color: tc.text }]}>Configure widget</Text>
              <TextInputField label="Widget title" value={selected.title} onChangeText={(value) => updateWidget({ title: value })} />
              <SelectField label="Visualization" value={selected.type} options={widgetTypes} onSelect={(value) => updateWidget({ type: value as WidgetType })} />
              <SelectField label="Data source" value={selected.dataSource} options={sources} onSelect={(value) => updateWidget({ dataSource: value as DataSource, fields: [sourceFields[value as DataSource][0]] })} />
              <Text style={[styles.fieldLabel, { color: tc.textSecondary }]}>Fields</Text>
              <View style={styles.widgetTypes}>
                {sourceFields[selected.dataSource].map((field) => {
                  const active = selected.fields.includes(field);
                  return <TouchableOpacity key={field} onPress={() => toggleField(field)} style={[styles.fieldChip, { borderColor: active ? tc.primary : tc.border, backgroundColor: active ? tc.primary : tc.surface }]} accessibilityRole="checkbox" accessibilityState={{ checked: active }}>
                    <Text style={{ color: active ? '#FFFFFF' : tc.text }}>{active ? '✓ ' : ''}{field}</Text>
                  </TouchableOpacity>;
                })}
              </View>
              {selected.type !== 'table' && (
                <>
                  <SelectField label="Aggregation" value={selected.aggregation || 'count'} options={aggregations} onSelect={(value) => updateWidget({ aggregation: value })} />
                  <SelectField label="Aggregate field" value={selected.aggregateField || selected.fields[0] || ''} options={sourceFields[selected.dataSource].map((field) => ({ id: field, label: field }))} onSelect={(value) => updateWidget({ aggregateField: value })} />
                </>
              )}
            </View>
          )}
          {preview && <Text style={{ color: tc.textSecondary }}>Preview shows the configured widget definitions; report data is generated separately.</Text>}
          <View style={styles.actions}>
            <Button title={preview ? 'Edit' : 'Preview'} variant="secondary" style={styles.actionButton} onPress={() => setPreview((value) => !value)} />
            {hasPermission('reporting.write') && (
              <Button title="Save Report" style={styles.actionButton} loading={saving} onPress={save} />
            )}
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
  headerTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  card: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  widgetTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeButton: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 11 },
  widgetRow: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 12, marginBottom: 8 },
  widgetLabel: { flex: 1, gap: 4 },
  config: { marginTop: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  fieldChip: { borderWidth: 1, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1 },
  error: { marginBottom: 12 },
});
