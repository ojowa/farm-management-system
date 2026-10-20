import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import LivestockHubScreen from '../../app/(app)/livestock';

const mockPush = jest.fn();
let mockParams: { farmId?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockParams,
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

describe('Livestock hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it('provides navigation to livestock, health, and breeding', () => {
    render(<LivestockHubScreen />);

    for (const section of ['Livestock', 'Health', 'Breeding']) {
      fireEvent.press(screen.getByLabelText(section));
    }

    expect(mockPush.mock.calls).toEqual([
      ['/livestock/animals'],
      ['/livestock/health'],
      ['/livestock/breeding'],
    ]);
  });

  it('preserves farm context when opening the livestock list', () => {
    mockParams = { farmId: 'farm 1' };
    render(<LivestockHubScreen />);

    fireEvent.press(screen.getByLabelText('Livestock'));

    expect(mockPush).toHaveBeenCalledWith('/livestock/animals?farmId=farm%201');
  });
});
