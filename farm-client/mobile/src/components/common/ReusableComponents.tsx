import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors } from './UIComponents';

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
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
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
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
  statsLabel: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark,
  },
  statsTrend: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  breadcrumbItem: {
    fontSize: 14,
    color: colors.textLight,
  },
  breadcrumbActive: {
    color: colors.dark,
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    marginHorizontal: 6,
    color: colors.border,
  },
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 4,
  },
  pageDescription: {
    fontSize: 14,
    color: colors.textLight,
  },
  pageActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  alertContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
  },
  alertClose: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.light,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});

// Badge Component
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

// Modal Component
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

// EmptyState Component
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

// StatsCard Component
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

// Breadcrumb Component
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

// PageHeader Component
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

// ConfirmDialog Component
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

// Alert Component
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

// LoadingSpinner Component
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
