import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import EquipmentScreen from '../../app/(app)/equipment';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The list screen loads equipment (equipmentAPI.list → GET /equipment) and the
// farm names (farmsAPI.list) on mount. Both are stubbed so a single endpoint
// can be failed to exercise the retryable error path.

const mockList = jest.fn();
const mockDelete = jest.fn();
const mockFarmsList = jest.fn();
const mockHasPermission = jest.fn();
const mockShowError = jest.fn();
const mockPush = jest.fn();

jest.mock('@/modules/inventory', () => ({
  equipmentAPI: {
    list: (...a: any[]) => mockList(...a),
    delete: (...a: any[]) => mockDelete(...a),
  },
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

const EQUIPMENT = [
  {
    id: 'e1',
    farmId: 'farm1',
    name: 'Tractor',
    type: 'Machinery',
    model: 'Kubota L3902',
    serialNumber: 'SN-12345',
    purchaseCost: 15000,
    status: 'ACTIVE',
    purchaseDate: '2024-01-15',
    notes: null,
  },
  {
    id: 'e2',
    farmId: null,
    name: 'Chainsaw',
    type: 'Tool',
    model: 'MS261',
    serialNumber: 'SN-99999',
    purchaseCost: 500,
    status: 'MAINTENANCE',
    purchaseDate: '2024-02-01',
    notes: null,
  },
];

describe('EquipmentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue({ data: EQUIPMENT });
    mockFarmsList.mockResolvedValue({ data: [{ id: 'farm1', name: 'Sunrise Farm' }] });
    mockHasPermission.mockReturnValue(true);
  });

  it('renders equipment with name, serial number and status', async () => {
    render(<EquipmentScreen />);

    expect(await screen.findByText('Tractor')).toBeTruthy();
    expect(screen.getByText('Chainsaw')).toBeTruthy();
    expect(screen.getByText('SN-12345')).toBeTruthy();
  });

  it('shows a retryable connection error (not a false empty state) when the list fails', async () => {
    mockList.mockRejectedValue(NETWORK_ERROR);

    render(<EquipmentScreen />);

    expect(await screen.findByText("Couldn't load equipment")).toBeTruthy();
    expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    // The failure must not masquerade as genuinely-empty data.
    expect(screen.queryByText('No Equipment Yet')).toBeNull();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('filters equipment by status', async () => {
    render(<EquipmentScreen />);
    await screen.findByText('Tractor');

    fireEvent.press(screen.getByLabelText('Filter maintenance equipment'));

    expect(screen.queryByText('Tractor')).toBeNull();
    expect(screen.getByText('Chainsaw')).toBeTruthy();
  });

  it('shows the empty state when there is no equipment', async () => {
    mockList.mockResolvedValue({ data: [] });

    render(<EquipmentScreen />);

    expect(await screen.findByText('No Equipment Yet')).toBeTruthy();
  });

  it('hides the add action without farm.write permission', async () => {
    mockHasPermission.mockImplementation((p: string) => p === 'farm.read');

    render(<EquipmentScreen />);
    await screen.findByText('Tractor');

    expect(screen.queryByLabelText('Add new equipment')).toBeNull();
  });
});
