import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import InventoryHubScreen from '../../app/(app)/inventory';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/core/ui/MenuButton', () => ({ MenuButton: () => null }));

jest.mock('@/core/theme/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#FFFFFF',
      headerBg: '#2E7D32',
      primary: '#2E7D32',
      card: '#FFFFFF',
      border: '#E0E0E0',
      text: '#212121',
      textSecondary: '#757575',
    },
  }),
}));

describe('Inventory hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('links to all items and low stock', () => {
    render(<InventoryHubScreen />);

    fireEvent.press(screen.getByLabelText('All Items'));
    fireEvent.press(screen.getByLabelText('Low Stock'));

    expect(mockPush.mock.calls).toEqual([
      ['/inventory/list'],
      ['/inventory/low-stock'],
    ]);
  });
});
