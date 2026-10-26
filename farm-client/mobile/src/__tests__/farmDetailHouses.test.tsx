import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import FarmDetailScreen from '../../app/(app)/farms/[id]/index';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The farm detail screen loads two per-farm lists on focus: fields and poultry
// houses. Both must be scoped by the farm in the route, and the house rows
// must open that house's management screen.

const mockFieldsList = jest.fn();
const mockHousesList = jest.fn();
const mockCanCreate = jest.fn();
const mockCanDelete = jest.fn();
const mockPush = jest.fn();

jest.mock('@/modules/farm', () => ({
  useGetFarmQuery: () => ({
    data: {
      id: 'farm-1',
      name: 'Sunrise Farm',
      farmType: 'POULTRY',
      location: 'Oyo State',
      size: 12,
      status: 'active',
      createdAt: '2024-01-01',
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useDeleteFarmMutation: () => [jest.fn(), { isLoading: false }],
  fieldsAPI: { list: (...a: any[]) => mockFieldsList(...a) },
}));

jest.mock('@/modules/poultry', () => ({
  poultryHousesAPI: { list: (...a: any[]) => mockHousesList(...a) },
}));

// The record panel next to the houses pulls this farm's tasks and worker
// headcount — both answered from the shared services module.
const mockTasksList = jest.fn();
const mockWorkersList = jest.fn();

jest.mock('@/services/api', () => ({
  tasksAPI: { list: (...a: any[]) => mockTasksList(...a) },
  workersAPI: { list: (...a: any[]) => mockWorkersList(...a) },
}));

jest.mock('@/modules/poultry/flockChain', () => ({
  unwrapList: (payload: any) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
  },
}));

jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAppDispatch: () => jest.fn(),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  setSelectedFarmId: jest.fn(() => ({ type: 'ui/setSelectedFarmId' })),
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({ canCreate: mockCanCreate, canDelete: mockCanDelete }),
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
      borderLight: '#F3F4F6',
      surface: '#FFFFFF',
      headerBg: '#16A34A',
      error: '#B91C1C',
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'farm-1' }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => cb(), [cb]);
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const HOUSES = [
  { id: 'house-1', farmId: 'farm-1', name: 'Layer House 1', capacity: 500 },
  { id: 'house-2', farmId: 'farm-1', name: 'Layer House 2', capacity: 250 },
];

describe('FarmDetailScreen — poultry houses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanCreate.mockReturnValue(false);
    mockCanDelete.mockReturnValue(false);
    mockFieldsList.mockResolvedValue({ data: [{ id: 'field-1', name: 'North Field', size: 4 }] });
    mockHousesList.mockResolvedValue({ data: HOUSES });
    mockTasksList.mockResolvedValue({ data: { data: [] } });
    mockWorkersList.mockResolvedValue({ data: [], total: 3 });
  });

  it('lists the farm\'s houses beside the fields, both scoped by farmId', async () => {
    render(<FarmDetailScreen />);

    expect(await screen.findByText('Layer House 1', {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText('Layer House 2')).toBeTruthy();
    expect(screen.getByText('Capacity 500')).toBeTruthy();

    // Fields and houses are both fetched for the farm in the route.
    expect(mockFieldsList).toHaveBeenCalledWith({ farmId: 'farm-1' });
    expect(mockHousesList).toHaveBeenCalledWith({ farmId: 'farm-1', limit: 1000 });
    // …and the fields card still renders alongside.
    expect(screen.getByText('North Field')).toBeTruthy();
  });

  it('opens a house when its row is tapped', async () => {
    render(<FarmDetailScreen />);

    fireEvent.press(await screen.findByText('Layer House 1', {}, { timeout: 10000 }));

    expect(mockPush).toHaveBeenCalledWith('/poultry/houses/house-1');
  });

  it('links out to the full houses list', async () => {
    render(<FarmDetailScreen />);

    fireEvent.press(await screen.findByText('View all', {}, { timeout: 10000 }));

    expect(mockPush).toHaveBeenCalledWith('/poultry/houses');
  });

  it('shows an empty state instead of a blank card', async () => {
    mockHousesList.mockResolvedValue({ data: [] });

    render(<FarmDetailScreen />);

    expect(
      await screen.findByText('No poultry houses on this farm yet.', {}, { timeout: 10000 })
    ).toBeTruthy();
    // Fields are unaffected by an empty house list.
    expect(await screen.findByText('North Field')).toBeTruthy();
  });

  it('reports a house fetch failure without blanking the fields card', async () => {
    mockHousesList.mockRejectedValue({
      response: { status: 500, data: { message: 'boom' } },
    });

    render(<FarmDetailScreen />);

    expect(
      await screen.findByText('The server ran into a problem. Please try again in a moment.', {}, { timeout: 10000 })
    ).toBeTruthy();
    expect(await screen.findByText('North Field')).toBeTruthy();
  });

  it('keeps editing actions gated by farm.write', async () => {
    mockCanCreate.mockReturnValue(true);
    mockCanDelete.mockReturnValue(true);

    render(<FarmDetailScreen />);

    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy());
    expect(screen.getByText('Delete')).toBeTruthy();
  });
});
