import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ReportsHubScreen from '../../app/(app)/reports';

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

describe('Reports hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('links to reports and scheduled reports', () => {
    render(<ReportsHubScreen />);

    fireEvent.press(screen.getByLabelText('Reports'));
    fireEvent.press(screen.getByLabelText('Scheduled'));

    expect(mockPush.mock.calls).toEqual([
      ['/reports/list'],
      ['/reports/scheduled'],
    ]);
  });
});
