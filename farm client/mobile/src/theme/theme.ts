import { useColorScheme } from 'react-native';

export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  borderLight: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;
  disabled: string;
  overlay: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  headerBg: string;
  headerText: string;
  banner: string;
  bannerText: string;
  skeleton: string;
}

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export const spacing: Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const lightColors: ThemeColors = {
  primary: '#2E7D32',
  secondary: '#1976D2',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#424242',
  textSecondary: '#757575',
  textInverse: '#FFFFFF',
  border: '#BDBDBD',
  borderLight: '#E0E0E0',
  inputBg: '#FFFFFF',
  inputBorder: '#BDBDBD',
  inputText: '#424242',
  placeholder: '#9E9E9E',
  disabled: '#E0E0E0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  tabBar: '#FFFFFF',
  tabBarActive: '#2E7D32',
  tabBarInactive: '#757575',
  headerBg: '#2E7D32',
  headerText: '#FFFFFF',
  banner: '#FF9800',
  bannerText: '#FFFFFF',
  skeleton: '#E0E0E0',
};

const darkColors: ThemeColors = {
  primary: '#66BB6A',
  secondary: '#42A5F5',
  success: '#66BB6A',
  error: '#EF5350',
  warning: '#FFA726',
  info: '#42A5F5',
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2C2C2C',
  text: '#E0E0E0',
  textSecondary: '#9E9E9E',
  textInverse: '#121212',
  border: '#424242',
  borderLight: '#333333',
  inputBg: '#2C2C2C',
  inputBorder: '#424242',
  inputText: '#E0E0E0',
  placeholder: '#757575',
  disabled: '#333333',
  overlay: 'rgba(0, 0, 0, 0.7)',
  tabBar: '#1E1E1E',
  tabBarActive: '#66BB6A',
  tabBarInactive: '#757575',
  headerBg: '#1E1E1E',
  headerText: '#E0E0E0',
  banner: '#FFA726',
  bannerText: '#121212',
  skeleton: '#333333',
};

export type ThemeMode = 'light' | 'dark' | 'system';

export function useTheme(mode: ThemeMode = 'system'): ThemeColors {
  const systemScheme = useColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  return isDark ? darkColors : lightColors;
}

export function getThemeForMode(mode: ThemeMode, systemScheme: string | null | undefined): ThemeColors {
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  return isDark ? darkColors : lightColors;
}

export { lightColors, darkColors };
