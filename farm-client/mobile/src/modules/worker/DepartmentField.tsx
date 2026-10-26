import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { departmentsAPI } from '../../services/api';
import type { Department } from '../../services/types';
import { colors, TextInputField } from '../../core/ui/UIComponents';

/**
 * Department picker for the worker form: chips for the organisation's
 * Departments, plus "Other…" for the free text the server still accepts
 * (resolveDepartment creates a row from a name it has never seen).
 *
 * Degrades to the plain text input when /departments is empty or unreachable —
 * a worker must still be assignable to "Dairy" on a server that predates the
 * departments feature.
 */

export interface DepartmentChange {
  /** Worker.department — the name stored on the row. */
  department: string;
  /** Department row id ('' = free text / none). */
  departmentId: string;
}

export interface DepartmentFieldProps {
  label?: string;
  value: string;
  departmentId: string;
  onChange: (change: DepartmentChange) => void;
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
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
});

export function DepartmentField({
  label = 'Department',
  value,
  departmentId,
  onChange,
}: DepartmentFieldProps) {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [otherChosen, setOtherChosen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    departmentsAPI
      .list()
      .then((res) => {
        const payload: any = res?.data;
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];
        if (!cancelled) setDepartments(rows.filter((d: any) => d?.id && d?.name));
      })
      .catch(() => {
        // No /departments — the field falls back to free text.
        if (!cancelled) setDepartments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = departments ?? [];
  // A saved department may be a known row (by id, or by name for rows written
  // before the id existed) or free text the server has not resolved yet.
  const known =
    rows.find((d) => d.id === departmentId) ||
    (!departmentId ? rows.find((d) => d.name === value) : undefined);

  useEffect(() => {
    if (!departments) return;
    if (known) setOtherChosen(false);
    else if (value) setOtherChosen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, value, departmentId]);

  if (departments === null || rows.length === 0) {
    return (
      <TextInputField
        label={label}
        placeholder="e.g. Dairy"
        value={value}
        onChangeText={(v) => onChange({ department: v, departmentId: '' })}
      />
    );
  }

  const chipStyle = (active: boolean) => [styles.chip, active && styles.chipActive];
  const chipTextStyle = (active: boolean) => [styles.chipText, active && styles.chipTextActive];
  const showOther = otherChosen || (!!value && !known);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {rows.map((dept) => {
          const active = known?.id === dept.id;
          return (
            <TouchableOpacity
              key={dept.id}
              onPress={() => {
                setOtherChosen(false);
                onChange({ department: dept.name, departmentId: dept.id });
              }}
              style={chipStyle(active)}
              accessibilityRole="button"
              accessibilityLabel={`Department ${dept.name}`}
              accessibilityState={{ selected: active }}
            >
              <Text style={chipTextStyle(active)}>{dept.name}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => {
            setOtherChosen(true);
            onChange({ department: value, departmentId: '' });
          }}
          style={chipStyle(!known && showOther)}
          accessibilityRole="button"
          accessibilityLabel="Other department"
          accessibilityState={{ selected: !known && showOther }}
        >
          <Text style={chipTextStyle(!known && showOther)}>Other…</Text>
        </TouchableOpacity>
      </View>
      {showOther && (
        <TextInputField
          label="Other department"
          placeholder="Type a department name"
          value={value}
          onChangeText={(v) => onChange({ department: v, departmentId: '' })}
        />
      )}
    </View>
  );
}
