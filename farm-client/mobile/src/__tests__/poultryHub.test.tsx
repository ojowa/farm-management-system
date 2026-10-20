import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PoultryHubScreen from '../../app/(app)/poultry';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/core/ui/MenuButton', () => ({
  MenuButton: () => null,
}));

jest.mock('@/core/theme/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#FFFFFF',
      headerBg: '#166534',
      primary: '#16A34A',
      card: '#FFFFFF',
      border: '#E5E7EB',
      text: '#111827',
      textSecondary: '#6B7280',
    },
  }),
}));

describe('PoultryHubScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows all poultry management areas', () => {
    render(<PoultryHubScreen />);

    [
      'Flocks & Batches',
      'Houses & Pens',
      'Feeding',
      'Vaccinations',
      'Medications',
      'Mortality',
      'Egg Production',
      'Sales',
    ].forEach((section) => expect(screen.getByLabelText(section)).toBeTruthy());
  });

  it('opens the selected management screen', () => {
    render(<PoultryHubScreen />);

    fireEvent.press(screen.getByLabelText('Egg Production'));
    expect(mockPush).toHaveBeenCalledWith('/poultry/egg-production');
  });
});
