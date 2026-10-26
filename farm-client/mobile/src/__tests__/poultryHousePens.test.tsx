import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import HousePensScreen from '../../app/(app)/poultry/houses/[id]';

// ─── API mocks ────────────────────────────────────────────────────────────────
// Tapping a house opens this screen: it loads the house (GET /poultry-houses/:id)
// and its pens (GET /pens?poultryHouseId=…) together, then manages them. The
// house comes from the route, so creating a pen must always send that id.

const mockHouseGet = jest.fn();
const mockPensList = jest.fn();
const mockPenCreate = jest.fn();
const mockFarmGet = jest.fn();
const mockHasPermission = jest.fn();
const mockCanCreate = jest.fn();
const mockPush = jest.fn();

jest.mock('@/modules/poultry', () => ({
  poultryHousesAPI: { get: (...a: any[]) => mockHouseGet(...a), list: jest.fn(), create: jest.fn() },
  pensAPI: {
    list: (...a: any[]) => mockPensList(...a),
    create: (...a: any[]) => mockPenCreate(...a),
    update: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('@/modules/farm', () => ({
  farmsAPI: { get: (...a: any[]) => mockFarmGet(...a), list: jest.fn() },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: mockHasPermission, canCreate: mockCanCreate }),
}));

// The record panel on this screen asks /tasks for the house's linked tasks.
const mockTasksList = jest.fn();

jest.mock('@/services/api', () => ({
  tasksAPI: { list: (...a: any[]) => mockTasksList(...a) },
  workersAPI: { list: jest.fn() },
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

jest.mock('@/core/ui/MenuButton', () => ({ MenuButton: () => null }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'house-1' }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const HOUSE = {
  id: 'house-1',
  name: 'Layer House 1',
  farmId: 'farm1',
  capacity: 5000,
  createdAt: '2024-01-01',
};

const PENS = [
  { id: 'pen1', poultryHouseId: 'house-1', name: 'Pen A', capacity: 500 },
  { id: 'pen2', poultryHouseId: 'house-1', name: 'Pen B', capacity: 250 },
];

describe('PoultryHousePensScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockCanCreate.mockReturnValue(false);
    mockHouseGet.mockResolvedValue({ data: HOUSE });
    mockFarmGet.mockResolvedValue({ data: { name: 'Sunrise Farm' } });
    mockTasksList.mockResolvedValue({ data: { data: [] } });
  });

  it('loads only this house and lists its pens', async () => {
    mockPensList.mockResolvedValue({ data: PENS });

    render(<HousePensScreen />);

    // The name appears in the header and on the summary card.
    expect(
      await screen.findAllByText('Layer House 1', {}, { timeout: 10000 })
    ).toHaveLength(2);
    // The pens query must be scoped to the house in the route.
    expect(mockPensList).toHaveBeenCalledWith({ poultryHouseId: 'house-1', limit: 500 });
    expect(await screen.findByText('Pen A')).toBeTruthy();
    expect(await screen.findByText('Pen B')).toBeTruthy();
    expect(await screen.findByText(/Sunrise Farm/)).toBeTruthy();
  });

  it('shows an empty state instead of a blank list', async () => {
    mockPensList.mockResolvedValue({ data: [] });

    render(<HousePensScreen />);

    expect(await screen.findByText('No pens in this house yet.', {}, { timeout: 10000 })).toBeTruthy();
  });

  it('creates a pen under this house', async () => {
    mockPensList.mockResolvedValueOnce({ data: PENS }).mockResolvedValue({ data: [...PENS, { id: 'pen3', poultryHouseId: 'house-1', name: 'Pen C', capacity: 100 }] });
    mockPenCreate.mockResolvedValue({ data: {} });

    render(<HousePensScreen />);
    fireEvent.press(await screen.findByText('Add Pen', {}, { timeout: 10000 }));

    fireEvent.changeText(screen.getByLabelText('Pen name'), 'Pen C');
    fireEvent.changeText(screen.getByLabelText('Capacity'), '100');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() =>
      expect(mockPenCreate).toHaveBeenCalledWith({
        poultryHouseId: 'house-1',
        name: 'Pen C',
        capacity: 100,
      })
    );
    // The list reloads after a successful save.
    await screen.findByText('Pen C');
    expect(mockPensList).toHaveBeenCalledTimes(2);
  });

  it('rejects a non-positive capacity before touching the API', async () => {
    mockPensList.mockResolvedValue({ data: PENS });

    render(<HousePensScreen />);
    fireEvent.press(await screen.findByText('Add Pen', {}, { timeout: 10000 }));

    fireEvent.changeText(screen.getByLabelText('Pen name'), 'Pen C');
    fireEvent.changeText(screen.getByLabelText('Capacity'), '0');
    fireEvent.press(screen.getByText('Save'));

    expect(await screen.findByText('Capacity must be a positive whole number.')).toBeTruthy();
    expect(mockPenCreate).not.toHaveBeenCalled();
  });
});
