import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../UIComponents';

export interface StateViewProps {
  variant: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

export const StateView: React.FC<StateViewProps> = ({
  variant,
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  style,
}) => {
  if (variant === 'loading') {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  if (variant === 'error') {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.icon}>!</Text>
        <Text style={styles.title}>{title ?? 'Something went wrong'}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {onRetry ? (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title ?? 'Nothing here yet'}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export interface SkeletonRowProps {
  rows?: number;
  style?: ViewStyle;
}

// Lightweight skeleton block used by data screens while their initial fetch
// is in flight. We animate via opacity pulse to avoid relying on a layout
// thread trick that can fight ScrollView virtualization.
export const SkeletonRow: React.FC<SkeletonRowProps> = ({ rows = 1, style }) => {
  const [pulse, setPulse] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 2), 650);
    return () => clearInterval(id);
  }, []);

  const blocks: React.ReactElement[] = [];
  for (let i = 0; i < rows; i += 1) {
    blocks.push(
      <View
        key={i}
        style={[
          styles.skeletonRow,
          { opacity: pulse ? 0.55 : 1 },
          i > 0 && { marginTop: 12 },
          style,
        ]}
      >
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonLines}>
          <View style={[styles.skeletonLine, { width: '70%' }]} />
          <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
        </View>
      </View>
    );
  }
  return <View>{blocks}</View>;
};

export interface ScreenLoadingProps {
  message?: string;
}

// Replaces the spinning ActivityIndicator inside screens that wait on a
// first-time fetch. Shows skeletons so users see something concrete
// approaching its eventual shape.
export const ScreenLoading: React.FC<ScreenLoadingProps> = ({
  message = 'Loading…',
}) => (
  <View style={styles.screenLoading}>
    <SkeletonRow rows={3} />
    <Text style={styles.screenLoadingLabel}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  icon: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.error,
    width: 64,
    height: 64,
    borderRadius: 32,
    textAlign: 'center',
    lineHeight: 64,
    borderWidth: 2,
    borderColor: colors.error,
    marginBottom: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light,
    marginRight: 12,
  },
  skeletonLines: {
    flex: 1,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.light,
  },
  screenLoading: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  screenLoadingLabel: {
    textAlign: 'center',
    color: colors.textLight,
    fontSize: 13,
    marginTop: 16,
  },
});

