import React from 'react';
import { render, screen } from '@testing-library/react-native';
import FlockDetailScreen from '../../app/(app)/poultry/[id]';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The detail screen loads the flock (GET /flocks/:id) and, as a fallback,
// the farm name (GET /farms/:id). The server now ships breed / pen / house /
// farm joins on the flock itself, so those rows must render straight from the
// record — they used to show `—` because the response was flat.

const mockGet = jest.fn();
const mockFarmGet = jest.fn();
const mockHasPermission = jest.fn();
const mockPush = jest.fn();

jest.mock('@/modules/poultry', () => ({
  poultryAPI: { get: (...a: any[]) => mockGet(...a) },
  offlinePoultryAPI: { delete: jest.fn(), update: jest.fn() },
}));

jest.mock('@/modules/farm', () => ({
  farmsAPI: { get: (...a: any[]) => mockFarmGet(...a) },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: mockHasPermission }),
}));

jest.mock('@/core/hooks/useToasts', () => ({
  useToasts: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() }),
}));

jest.mock('@/core/theme/ThemeContext', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      primary: '#16A34A',
      background: '#F9FAFB',
      text: '#111827',
      textSecondary: '#6B7280',
      card: '#FFFFFF',
      border: '#E5E7EB',
      surface: '#FFFFFF',
      headerBg: '#16A34A',
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'flock-1' }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const JOINED_FLOCK = {
  id: 'flock-1',
  batchCode: 'BATCH-A',
  farmId: 'farm1',
  penId: 'pen1',
  breedId: 'breed1',
  birdCount: 100,
  currentCount: 95,
  currentAgeDays: 30,
  arrivalDate: '2024-01-15',
  status: 'ACTIVE',
  breed: { id: 'breed1', name: 'Cobb 500', birdType: 'BROILER' },
  pen: {
    id: 'pen1',
    name: 'Pen A',
    poultryHouseId: 'house1',
    poultryHouse: { id: 'house1', name: 'Layer House 1' },
  },
  farm: { id: 'farm1', name: 'Sunrise Farm' },
};

describe('FlockDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockReturnValue(false);
    mockFarmGet.mockResolvedValue({ data: { name: 'Fallback Farm' } });
  });

  it('renders breed, pen, house and farm from the joins on the flock', async () => {
    mockGet.mockResolvedValue({ data: JOINED_FLOCK });

    render(<FlockDetailScreen />);

    expect(await screen.findByText('BATCH-A', {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText('Cobb 500 · BROILER')).toBeTruthy();
    expect(screen.getByText('Pen A')).toBeTruthy();
    expect(screen.getByText('Layer House 1')).toBeTruthy();
    expect(screen.getByText('Sunrise Farm')).toBeTruthy();
    // The rows must not fall back to the em-dash placeholder.
    expect(screen.queryByText('—')).toBeNull();
  });

  it('falls back to the farm lookup when the record predates the joins', async () => {
    mockGet.mockResolvedValue({
      data: { ...JOINED_FLOCK, breed: null, pen: null, farm: null },
    });

    render(<FlockDetailScreen />);

    // Farm still resolves through the per-id lookup…
    expect(await screen.findByText('Fallback Farm', {}, { timeout: 10000 })).toBeTruthy();
    expect(mockFarmGet).toHaveBeenCalledWith('farm1');
    // …while the joined-only rows show the placeholder, not a wrong value.
    expect((await screen.findAllByText('—', {}, { timeout: 10000 })).length).toBeGreaterThan(0);
  });
});
