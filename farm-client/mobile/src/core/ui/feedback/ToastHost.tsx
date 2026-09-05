import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToasts } from '../../hooks/useToasts';
import { colors } from '../UIComponents';
import type { Toast } from '../../../store/slices/uiSlice';

const TYPE_BG: Record<Toast['type'], string> = {
  success: '#1B5E20',
  error: '#B71C1C',
  warning: '#E65100',
  info: '#0D47A1',
};

const TYPE_LABEL: Record<Toast['type'], string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

const ToastHostInner: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { removeToast } = useToasts();
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -40,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => removeToast(toast.id));
    }, toast.duration ?? 4000);

    return () => clearTimeout(timeout);
  }, [opacity, removeToast, toast.duration, toast.id, translateY]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: TYPE_BG[toast.type], opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${TYPE_LABEL[toast.type]}: ${toast.message}`}
        onPress={() => removeToast(toast.id)}
        style={styles.toastInner}
      >
        <Text style={styles.toastLabel}>{TYPE_LABEL[toast.type]}</Text>
        <Text style={styles.toastMessage} numberOfLines={3}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

export const ToastHost: React.FC = () => {
  const { toasts } = useToasts();

  if (!toasts.length) return null;

  return (
    <SafeAreaView
      pointerEvents="box-none"
      edges={['top']}
      style={styles.host}
    >
      <View pointerEvents="box-none" style={styles.hostInner}>
        {toasts.map((toast) => (
          <ToastHostInner key={toast.id} toast={toast} />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 12,
  },
  hostInner: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 4 : 12,
  },
  toast: {
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  toastInner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  toastMessage: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
});
