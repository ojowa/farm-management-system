import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PoultryScreen from '../../app/(app)/poultry';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The list screen loads flocks (offlinePoultryAPI.list → GET /flocks) and the
// farm names (farmsAPI.list) on mount. Both are stubbed so a single endpoint
// can be failed to exercise the retryable error path.

const mockList = jest.fn();
const mockDelete = jest.fn();
const mockFarmsList = jest.fn();
const mockHasPermission = jest.fn();
const mockShowError = jest.fn();
const mockPush = jest.fn();

jest.mock('@/modules/poultry', () => ({
  poultryAPI: { list: (...a: any[]) => mockList(...a), get: jest.fn() },
  offlinePoultryAPI: {
    list: (...a: any[]) => mockList(...a),
    delete: (...a: any[]) => mockDelete(...a),
    create: jest.fn(),
  },
  poultryHousesAPI: { list: jest.fn() },
}));

jest.mock('@/modules/farm', () => ({
  farmsAPI: { list: (...a: any[]) => mockFarmsList(...a), get: jest.fn() },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: mockHasPermission }),
}));

jest.mock('@/core/hooks/useToasts', () => ({
  useToasts: () => ({ success: jest.fn(), error: mockShowError, info: jest.fn(), warning: jest.fn() }),
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
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const NETWORK_ERROR = new Error('Network Error');
const CONNECTION_COPY = 'No connection. Check your network and try again.';

const FLOCKS = [
  {
    id: 'f1',
    batchCode: 'BATCH-A',
    birdCount: 100,
    currentCount: 95,
    arrivalDate: '2024-01-15',
    currentAgeDays: 30,
    status: 'ACTIVE',
    farmId: 'farm1',
    breed: { id: 'b1', name: 'Broiler' },
  },
  {
    id: 'f2',
    batchCode: 'BATCH-B',
    birdCount: 50,
    currentCount: 50,
    arrivalDate: '2024-02-01',
    currentAgeDays: 10,
    status: 'SOLD',
    farmId: 'farm1',
    breed: { id: 'b2', name: 'Layer' },
  },
];

describe('PoultryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue({ data: FLOCKS });
    mockFarmsList.mockResolvedValue({ data: [{ id: 'farm1', name: 'Sunrise Farm' }] });
    mockHasPermission.mockReturnValue(true);
  });

  it('renders flocks with batch code, birds and status', async () => {
    render(<PoultryScreen />);

    expect(await screen.findByText('BATCH-A')).toBeTruthy();
    expect(screen.getByText('BATCH-B')).toBeTruthy();
    // Bird stat shows current/birds; breed + farm show on the card.
    expect(screen.getByText('95/100')).toBeTruthy();
    expect(screen.getByText(/Broiler/)).toBeTruthy();
  });

  it('shows a retryable connection error (not a false empty state) when the list fails', async () => {
    mockList.mockRejectedValue(NETWORK_ERROR);

    render(<PoultryScreen />);

    expect(await screen.findByText("Couldn't load flocks")).toBeTruthy();
    expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    // The failure must not masquerade as genuinely-empty data.
    expect(screen.queryByText('No Flocks Yet')).toBeNull();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('filters flocks by status', async () => {
    render(<PoultryScreen />);
    await screen.findByText('BATCH-A');

    fireEvent.press(screen.getByLabelText('Filter sold flocks'));

    expect(screen.queryByText('BATCH-A')).toBeNull();
    expect(screen.getByText('BATCH-B')).toBeTruthy();
  });

  it('shows the empty state when there are no flocks', async () => {
    mockList.mockResolvedValue({ data: [] });

    render(<PoultryScreen />);

    expect(await screen.findByText('No Flocks Yet')).toBeTruthy();
  });

  it('hides the add action without poultry.write permission', async () => {
    mockHasPermission.mockImplementation((p: string) => p === 'poultry.read');

    render(<PoultryScreen />);
    await screen.findByText('BATCH-A');

    expect(screen.queryByLabelText('Add new flock')).toBeNull();
  });
});
