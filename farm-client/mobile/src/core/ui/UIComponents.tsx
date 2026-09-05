import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  ScrollView,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';

// ─── Colors ────────────────────────────────────────────────────────────────────

const colorsRaw = {
  primary: '#2E7D32',
  secondary: '#1976D2',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  light: '#F5F5F5',
  dark: '#212121',
  border: '#BDBDBD',
  text: '#424242',
  textLight: '#616161',
} as const;

type Palette = typeof colorsRaw;
const palette: Palette = colorsRaw;
export const colors = palette;

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // TextInputField
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: palette.text },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.text,
  },
  inputFocused: { borderColor: palette.primary },
  errorText: { color: palette.error, fontSize: 12, marginTop: 4 },

  // Button
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: { backgroundColor: palette.primary },
  buttonSecondary: { backgroundColor: palette.secondary },
  buttonDisabled: { backgroundColor: palette.light },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  buttonTextDisabled: { color: palette.textLight },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Chip
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipPrimary: { backgroundColor: palette.primary },
  chipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },

  // Badge
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.dark },
  modalBody: { padding: 16 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },

  // EmptyState
  emptyContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.dark, marginBottom: 8, textAlign: 'center' },
  emptyDescription: { fontSize: 14, color: colors.textLight, textAlign: 'center', marginBottom: 16 },

  // StatsCard
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsLabel: { fontSize: 13, color: colors.textLight, marginBottom: 4 },
  statsValue: { fontSize: 24, fontWeight: '700', color: colors.dark },
  statsTrend: { fontSize: 13, fontWeight: '600', marginTop: 4 },

  // Breadcrumb
  breadcrumb: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 },
  breadcrumbItem: { fontSize: 14, color: colors.textLight },
  breadcrumbActive: { color: colors.dark, fontWeight: '600' },
  breadcrumbSeparator: { marginHorizontal: 6, color: colors.border },

  // PageHeader
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  pageDescription: { fontSize: 14, color: colors.textLight },
  pageActions: { flexDirection: 'row', gap: 8, marginTop: 12 },

  // Alert
  alertContainer: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  alertTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  alertText: { fontSize: 13 },
  alertClose: { position: 'absolute', top: 8, right: 8 },

  // ConfirmDialog
  confirmButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  confirmButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  cancelButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: colors.light },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
});

// ─── TextInputField ────────────────────────────────────────────────────────────

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoComplete?: string;
  textContentType?: string;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  editable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  rightIcon?: React.ReactNode;
}

export const TextInputField: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  editable = true,
  containerStyle,
  style,
  accessibilityLabel,
  rightIcon,
}) => {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.input,
          { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 },
          focused ? styles.inputFocused : null,
          !editable ? { backgroundColor: palette.light } : null,
        ]}
      >
        <TextInput
          style={[
            { flex: 1, paddingVertical: 10, fontSize: 16, color: palette.text },
            style,
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete as any}
          textContentType={textContentType as any}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={palette.textLight}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityRole="text"
          accessibilityState={{ disabled: !editable }}
        />
        {rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
      </View>
      {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
};

// ─── Button ────────────────────────────────────────────────────────────────────

export interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
  icon,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : null,
        variant === 'secondary' ? styles.buttonSecondary : null,
        isDisabled ? styles.buttonDisabled : null,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isDisabled ? palette.textLight : '#FFFFFF'}
          accessibilityLabel="Loading"
        />
      ) : (
        <>
          {icon ? icon : null}
          <Text
            style={[
              styles.buttonText,
              isDisabled ? styles.buttonTextDisabled : null,
              textStyle,
              icon ? { marginLeft: 8 } : null,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ─── Card ──────────────────────────────────────────────────────────────────────

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, accessibilityLabel }) => {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, style]} accessibilityRole="summary">
      {children}
    </View>
  );
};

// ─── Chip ──────────────────────────────────────────────────────────────────────

export interface ChipProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  selected?: boolean;
}

export const Chip: React.FC<ChipProps> = ({ label, onPress, variant = 'primary', selected }) => {
  return (
    <TouchableOpacity
      style={[styles.chip, variant === 'primary' ? styles.chipPrimary : null]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
};

// ─── Badge ─────────────────────────────────────────────────────────────────────

export interface BadgeProps {
  label: string;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  style?: object;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', style }) => {
  const variantStyles = {
    success: { backgroundColor: '#E8F5E9', color: colors.success },
    error: { backgroundColor: '#FFEBEE', color: colors.error },
    warning: { backgroundColor: '#FFF3E0', color: colors.warning },
    info: { backgroundColor: '#E3F2FD', color: colors.info },
    default: { backgroundColor: colors.light, color: colors.text },
  };

  return (
    <View style={[styles.badge, { backgroundColor: variantStyles[variant].backgroundColor }, style]}>
      <Text style={[styles.badgeText, { color: variantStyles[variant].color }]}>{label}</Text>
    </View>
  );
};

// ─── Modal ─────────────────────────────────────────────────────────────────────

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ visible, onClose, title, children, footer }) => {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>
          <ScrollView style={styles.modalBody}>{children}</ScrollView>
          {footer && <View style={styles.modalFooter}>{footer}</View>}
        </View>
      </TouchableOpacity>
    </RNModal>
  );
};

// ─── EmptyState ────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <View style={styles.emptyContainer}>
      {icon && <Text style={styles.emptyIcon}>{icon}</Text>}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDescription}>{description}</Text>}
      {action}
    </View>
  );
};

// ─── StatsCard ─────────────────────────────────────────────────────────────────

export interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  iconBackgroundColor?: string;
  style?: object;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  trend,
  trendValue,
  iconBackgroundColor = '#E8F5E9',
  style,
}) => {
  const trendColors = { up: colors.success, down: colors.error, neutral: colors.textLight };
  const trendIcons = { up: '↑', down: '↓', neutral: '→' };

  return (
    <View style={[styles.statsCard, style]}>
      <View style={[styles.statsIconContainer, { backgroundColor: iconBackgroundColor }]}>
        {icon}
      </View>
      <Text style={styles.statsLabel}>{label}</Text>
      <Text style={styles.statsValue}>{value}</Text>
      {trend && trendValue && (
        <Text style={[styles.statsTrend, { color: trendColors[trend] }]}>
          {trendIcons[trend]} {trendValue}
        </Text>
      )}
    </View>
  );
};

// ─── Breadcrumb ────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  onPress?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <View style={styles.breadcrumb} accessibilityRole="none" accessibilityLabel="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Text style={styles.breadcrumbSeparator}>/</Text>}
          {item.onPress ? (
            <TouchableOpacity onPress={item.onPress}>
              <Text style={styles.breadcrumbItem}>{item.label}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.breadcrumbItem, styles.breadcrumbActive]}>{item.label}</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

// ─── PageHeader ────────────────────────────────────────────────────────────────

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <View style={styles.pageHeader}>
      <Text style={styles.pageTitle}>{title}</Text>
      {description && <Text style={styles.pageDescription}>{description}</Text>}
      {actions && <View style={styles.pageActions}>{actions}</View>}
    </View>
  );
};

// ─── ConfirmDialog ─────────────────────────────────────────────────────────────

export interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
}) => {
  const confirmColor = variant === 'danger' ? colors.error : colors.warning;

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      <Text style={{ fontSize: 14, color: colors.text, marginBottom: 16 }}>{message}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: confirmColor }]}
          onPress={() => {
            onConfirm();
            onClose();
          }}
        >
          <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ─── Alert ─────────────────────────────────────────────────────────────────────

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, children, onClose }) => {
  const alertStyles = {
    info: { backgroundColor: '#E3F2FD', borderColor: colors.info, color: '#1565C0' },
    success: { backgroundColor: '#E8F5E9', borderColor: colors.success, color: '#2E7D32' },
    warning: { backgroundColor: '#FFF3E0', borderColor: colors.warning, color: '#E65100' },
    error: { backgroundColor: '#FFEBEE', borderColor: colors.error, color: '#C62828' },
  };

  const s = alertStyles[type];

  return (
    <View style={[styles.alertContainer, { backgroundColor: s.backgroundColor, borderColor: s.borderColor }]}>
      {title && <Text style={[styles.alertTitle, { color: s.color }]}>{title}</Text>}
      <Text style={[styles.alertText, { color: s.color }]}>{children}</Text>
      {onClose && (
        <TouchableOpacity style={styles.alertClose} onPress={onClose} accessibilityLabel="Close">
          <Text style={{ color: s.color, fontSize: 18 }}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── LoadingSpinner ────────────────────────────────────────────────────────────

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = colors.primary,
  label,
}) => {
  return (
    <View style={{ alignItems: 'center', padding: 20 }}>
      <ActivityIndicator size={size} color={color} accessibilityLabel={label || 'Loading'} />
      {label && <Text style={{ marginTop: 8, fontSize: 14, color: colors.textLight }}>{label}</Text>}
    </View>
  );
};
