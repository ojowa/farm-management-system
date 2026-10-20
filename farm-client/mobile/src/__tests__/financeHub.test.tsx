import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import FinanceHubScreen from '../../app/(app)/finance';

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

describe('Finance hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('links to transactions and profitability', () => {
    render(<FinanceHubScreen />);

    fireEvent.press(screen.getByLabelText('Finance'));
    fireEvent.press(screen.getByLabelText('Profitability'));

    expect(mockPush.mock.calls).toEqual([
      ['/finance/list'],
      ['/finance/profitability'],
    ]);
  });
});
