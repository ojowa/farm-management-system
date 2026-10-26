import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { departmentsAPI } from '../../services/api';
import type { Department } from '../../services/types';
import { colors } from '../../core/ui/UIComponents';
import { useAppTheme } from '../../core/theme/ThemeContext';
import { RECORD_SOURCES } from './taskLinks';

/**
 * The Department + "Link to a record" block shared by the task create modal
 * and the task edit screen, so both offer the same pickers and clear the link
 * the same way ("No link" → nulls, which re-normalises the whole triple
 * server-side).
 *
 * The department chips come from GET /departments; the record chips are loaded
 * lazily for whichever module is selected, so opening the form costs one call
 * and picking a module costs one more.
 */

export interface TaskLinkChange {
  linkedModule: string;
  linkedRecordId: string;
  linkedRecordName: string | null;
}

export interface TaskLinkFieldsProps {
  /** Selected Department row id ('' = no department). */
  departmentId: string;
  onDepartmentChange: (departmentId: string) => void;
  /** Task.linkedModule ('' = no link). */
  linkedModule: string;
  linkedRecordId: string;
  linkedRecordName?: string | null;
  onLinkChange: (change: TaskLinkChange) => void;
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  recordScroll: { marginBottom: 12 },
  recordRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: '#FFFFFF' },
  note: { fontSize: 12, color: colors.textLight, marginBottom: 12 },
});

export function TaskLinkFields({
  departmentId,
  onDepartmentChange,
  linkedModule,
  linkedRecordId,
  linkedRecordName,
  onLinkChange,
}: TaskLinkFieldsProps) {
  const { colors: tc } = useAppTheme();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [records, setRecords] = useState<Array<{ id: string; name: string }>>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    departmentsAPI
      .list()
      .then((res) => {
        const payload: any = res?.data;
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        if (!cancelled) setDepartments(rows.filter((d: any) => d?.id && d?.name));
      })
      .catch(() => {
        // Older servers have no /departments — the field degrades to "None".
        if (__DEV__) console.warn('[TaskLinkFields] Failed to load departments');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Records only load once a module is chosen, and re-load whenever the
  // module changes (including when the caller seeds one from a saved link).
  useEffect(() => {
    if (!linkedModule) {
      setRecords([]);
      return;
    }
    const source = RECORD_SOURCES.find((s) => s.key === linkedModule);
    if (!source) {
      setRecords([]);
      return;
    }
    let cancelled = false;
    setRecordsLoading(true);
    source
      .load()
      .then((options) => {
        if (cancelled) return;
        // Keep a saved link selectable even when its record is beyond the
        // first page (or belongs to a module the picker doesn't list).
        if (linkedRecordId && linkedRecordName && !options.some((o) => o.id === linkedRecordId)) {
          options = [{ id: linkedRecordId, name: linkedRecordName }, ...options];
        }
        setRecords(options);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to just the saved record so the current link stays visible.
        setRecords(
          linkedRecordId && linkedRecordName
            ? [{ id: linkedRecordId, name: linkedRecordName }]
            : []
        );
      })
      .finally(() => {
        if (!cancelled) setRecordsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedModule]);

  const dynamicChip = {
    backgroundColor: tc.card,
    borderColor: tc.border,
  };
  const dynamicChipText = { color: tc.text };

  const chipStyle = (active: boolean) => [styles.chip, dynamicChip, active && styles.chipActive];
  const chipTextStyle = (active: boolean) => [
    styles.chipText,
    dynamicChipText,
    active && styles.chipTextActive,
  ];

  return (
    <View>
      <Text style={[styles.label, { color: tc.text }]}>Department</Text>
      <View style={styles.chipRow}>
        <TouchableOpacity
          onPress={() => onDepartmentChange('')}
          style={chipStyle(!departmentId)}
          accessibilityRole="button"
          accessibilityLabel="No department"
          accessibilityState={{ selected: !departmentId }}
        >
          <Text style={chipTextStyle(!departmentId)}>None</Text>
        </TouchableOpacity>
        {departments.map((dept) => (
          <TouchableOpacity
            key={dept.id}
            onPress={() => onDepartmentChange(dept.id)}
            style={chipStyle(departmentId === dept.id)}
            accessibilityRole="button"
            accessibilityLabel={`Department ${dept.name}`}
            accessibilityState={{ selected: departmentId === dept.id }}
          >
            <Text style={chipTextStyle(departmentId === dept.id)}>{dept.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: tc.text }]}>Link to a record</Text>
      <View style={styles.chipRow}>
        <TouchableOpacity
          onPress={() => onLinkChange({ linkedModule: '', linkedRecordId: '', linkedRecordName: null })}
          style={chipStyle(!linkedModule)}
          accessibilityRole="button"
          accessibilityLabel="No link"
          accessibilityState={{ selected: !linkedModule }}
        >
          <Text style={chipTextStyle(!linkedModule)}>No link</Text>
        </TouchableOpacity>
        {RECORD_SOURCES.map((source) => (
          <TouchableOpacity
            key={source.key}
            onPress={() =>
              // Selecting a module only stages the link — the record chip
              // below completes it (the server stores none of the triple
              // until module AND id are both present).
              onLinkChange({ linkedModule: source.key, linkedRecordId: '', linkedRecordName: null })
            }
            style={chipStyle(linkedModule === source.key)}
            accessibilityRole="button"
            accessibilityLabel={`Link module ${source.label}`}
            accessibilityState={{ selected: linkedModule === source.key }}
          >
            <Text style={chipTextStyle(linkedModule === source.key)}>{source.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {linkedModule ? (
        recordsLoading ? (
          <Text style={[styles.note, { color: tc.textSecondary }]}>Loading records…</Text>
        ) : records.length === 0 ? (
          <Text style={[styles.note, { color: tc.textSecondary }]}>No records to link.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recordScroll}>
            <View style={styles.recordRow}>
              {records.map((record) => {
                const active = linkedRecordId === record.id;
                return (
                  <TouchableOpacity
                    key={record.id}
                    onPress={() =>
                      onLinkChange({
                        linkedModule,
                        linkedRecordId: record.id,
                        linkedRecordName: record.name,
                      })
                    }
                    style={chipStyle(active)}
                    accessibilityRole="button"
                    accessibilityLabel={`Link record ${record.name}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={chipTextStyle(active)}>{record.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )
      ) : null}
    </View>
  );
}
