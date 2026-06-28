import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';

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

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: palette.text,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.text,
  },
  inputFocused: {
    borderColor: palette.primary,
  },
  errorText: {
    color: palette.error,
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: palette.primary,
  },
  buttonSecondary: {
    backgroundColor: palette.secondary,
  },
  buttonDisabled: {
    backgroundColor: palette.light,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: palette.textLight,
  },
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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipPrimary: {
    backgroundColor: palette.primary,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  editable?: boolean;
  containerStyle?: ViewStyle;
  style?: TextStyle;
  accessibilityLabel?: string;
}

export const TextInputField: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry,
  keyboardType,
  editable = true,
  containerStyle,
  style,
  accessibilityLabel,
}) => {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          focused ? styles.inputFocused : null,
          !editable ? { backgroundColor: palette.light } : null,
          style,
        ]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={palette.textLight}
        accessibilityLabel={accessibilityLabel || label || placeholder}
        accessibilityRole="text"
        accessibilityState={{ disabled: !editable }}
      />
      {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
};

export interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
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

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
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

export interface ChipProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  selected?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  onPress,
  variant = 'primary',
  selected,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        variant === 'primary' ? styles.chipPrimary : null,
      ]}
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

export const colors = palette;
