import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import CropsHubScreen from '../../app/(app)/crops';

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

describe('Crops hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it('links to crops, calendar, pest and disease, and irrigation', () => {
    render(<CropsHubScreen />);

    for (const section of ['Crops', 'Calendar', 'Pest & Disease', 'Irrigation']) {
      fireEvent.press(screen.getByLabelText(section));
    }

    expect(mockPush.mock.calls).toEqual([
      ['/crops/list'],
      ['/crops/calendar'],
      ['/crops/pest-disease'],
      ['/crops/irrigation'],
    ]);
  });

  it('preserves farm context when opening a crop section', () => {
    mockParams = { farmId: 'farm 1' };
    render(<CropsHubScreen />);

    fireEvent.press(screen.getByLabelText('Calendar'));

    expect(mockPush).toHaveBeenCalledWith('/crops/calendar?farmId=farm%201');
  });
});
