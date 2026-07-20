export const colors = {
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
  white: '#FFFFFF',
  background: '#FAFAFA',
} as const;

export type Colors = typeof colors;
