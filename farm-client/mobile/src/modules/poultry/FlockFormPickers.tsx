import React, { useState } from 'react';
import { Modal, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/core/ui/UIComponents';
import { useAppTheme } from '@/core/theme/ThemeContext';

/**
 * The one picker used by every poultry form (Add Flock, Edit Flock).
 *
 * Both screens must offer the identical farm → house → pen → breed experience,
 * so the control lives here rather than being duplicated per screen: a labelled
 * select button that opens a modal list, with explicit loading / disabled /
 * error / retry affordances for the levels of the chain that load on demand.
 */
export interface PickerOption {
  id: string;
  name: string;
}

const styles = StyleSheet.create({
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: colors.text },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonDisabled: { opacity: 0.5 },
  selectButtonText: { fontSize: 16, color: colors.text },
  selectPlaceholder: { fontSize: 16, color: colors.textLight },
  selectArrow: { fontSize: 12, color: colors.textLight },
  selectError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  hint: { color: colors.textLight, fontSize: 12, marginTop: 4 },
  retryText: { color: colors.primary, fontSize: 12, marginTop: 4, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  modalItemText: { fontSize: 16, color: colors.text },
  modalItemEmpty: { paddingVertical: 20, alignItems: 'center' },
  modalItemEmptyText: { fontSize: 14, color: colors.textLight },
  modalCloseButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseButtonText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
});

export function PickerField({
  label,
  placeholder,
  selectedId,
  options,
  onSelect,
  error,
  disabled,
  disabledHint,
  loading,
  onRetry,
}: {
  label: string;
  placeholder: string;
  selectedId: string;
  options: PickerOption[];
  onSelect: (id: string) => void;
  error?: string;
  disabled?: boolean;
  disabledHint?: string;
  loading?: boolean;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { colors: tc, isDark } = useAppTheme();
  const selected = options.find((o) => o.id === selectedId);

  return (
    <View style={styles.formGroup}>
      <Text style={[styles.label, { color: tc.text }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.selectButton,
          error && styles.selectError,
          disabled && styles.selectButtonDisabled,
          { backgroundColor: tc.card },
          error ? undefined : { borderColor: tc.border },
        ]}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled || !!loading, expanded: open }}
      >
        <Text
          style={[
            selected ? styles.selectButtonText : styles.selectPlaceholder,
            { color: selected ? tc.text : tc.textSecondary },
          ]}
        >
          {loading ? 'Loading…' : selected ? selected.name : placeholder}
        </Text>
        <Text style={styles.selectArrow}>▼</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && loading ? (
        <Text style={[styles.hint, { color: tc.textSecondary }]}>Loading options…</Text>
      ) : null}
      {!error && !loading && disabled && disabledHint ? (
        <Text style={[styles.hint, { color: tc.textSecondary }]}>{disabledHint}</Text>
      ) : null}
      {!error && !loading && onRetry && options.length === 0 ? (
        <TouchableOpacity
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={`Retry loading ${label}`}
        >
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>{label}</Text>
              {options.length === 0 ? (
                <View style={styles.modalItemEmpty}>
                  <Text style={[styles.modalItemEmptyText, { color: tc.textSecondary }]}>
                    No options available
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, { borderBottomColor: isDark ? tc.surface : '#F5F5F5' }]}
                      onPress={() => {
                        onSelect(item.id);
                        setOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          item.id === selectedId && { color: colors.primary, fontWeight: '600' },
                          item.id === selectedId ? undefined : { color: tc.text },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setOpen(false)}>
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
