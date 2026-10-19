import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Modal, colors } from './UIComponents';

/**
 * A labelled select field that opens a modal option list — the mobile
 * equivalent of the admin portal's dropdown inputs. Used by the create/edit
 * forms (flock farm/pen/breed/status, worker farm/status, equipment
 * farm/status) so the picker behaviour lives in one place.
 */

export interface SelectOption {
  id: string;
  label: string;
}

export interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  /** Currently-selected option id ('' = nothing chosen yet). */
  value: string;
  options: SelectOption[];
  onSelect: (id: string) => void;
  error?: string;
  disabled?: boolean;
  disabledHint?: string;
  accessibilityLabel?: string;
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
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
  selectButtonError: { borderColor: colors.error },
  selectButtonText: { fontSize: 16, color: colors.text, flex: 1 },
  selectPlaceholder: { fontSize: 16, color: colors.textLight, flex: 1 },
  selectArrow: { fontSize: 12, color: colors.textLight, marginLeft: 8 },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  hint: { color: colors.textLight, fontSize: 12, marginTop: 4 },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  optionRowSelected: { backgroundColor: colors.light },
  optionText: { fontSize: 16, color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  emptyRow: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textLight },
});

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onSelect,
  error,
  disabled = false,
  disabledHint,
  accessibilityLabel,
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[
          styles.selectButton,
          error ? styles.selectButtonError : null,
          disabled ? styles.selectButtonDisabled : null,
        ]}
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label || placeholder}
        accessibilityState={{ disabled, expanded: open }}
      >
        <Text style={selected ? styles.selectButtonText : styles.selectPlaceholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.selectArrow}>▼</Text>
      </TouchableOpacity>
      {error ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {!error && disabled && disabledHint ? <Text style={styles.hint}>{disabledHint}</Text> : null}

      <Modal
        visible={open}
        onClose={() => setOpen(false)}
        title={label || placeholder}
      >
        {options.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No options available</Text>
          </View>
        ) : (
          options.map((option) => {
            const isSelected = option.id === value;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionRow, isSelected ? styles.optionRowSelected : null]}
                onPress={() => {
                  onSelect(option.id);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected ? styles.optionTextSelected : null,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </Modal>
    </View>
  );
};
