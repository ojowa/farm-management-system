import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import FarmsHubScreen from '../../app/(app)/farms';

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

describe('Farms hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('links to the farms list and map', () => {
    render(<FarmsHubScreen />);

    fireEvent.press(screen.getByLabelText('Farms'));
    fireEvent.press(screen.getByLabelText('Map'));

    expect(mockPush.mock.calls).toEqual([['/farms/list'], ['/farms/map']]);
  });
});
