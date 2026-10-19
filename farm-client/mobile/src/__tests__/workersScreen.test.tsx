import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import WorkersScreen from '../../app/(app)/workers';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The list screen loads workers (workersAPI.list → GET /workers) and the farm
// names (farmsAPI.list) on mount. Both are stubbed so a single endpoint can be
// failed to exercise the retryable error path.

const mockList = jest.fn();
const mockDelete = jest.fn();
const mockFarmsList = jest.fn();
const mockHasPermission = jest.fn();
const mockShowError = jest.fn();
const mockPush = jest.fn();

jest.mock('@/modules/hr', () => ({
  workersAPI: {
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

const WORKERS = [
  {
    id: 'w1',
    farmId: 'farm1',
    firstName: 'John',
    lastName: 'Doe',
    position: 'Farm Hand',
    department: 'Dairy',
    status: 'ACTIVE',
    phone: '+1 555 0100',
    hireDate: '2024-01-15',
  },
  {
    id: 'w2',
    farmId: 'farm1',
    firstName: 'Jane',
    lastName: 'Smith',
    position: 'Veterinarian',
    status: 'INACTIVE',
    phone: '+1 555 0200',
    hireDate: '2024-02-01',
  },
];

describe('WorkersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue({ data: WORKERS });
    mockFarmsList.mockResolvedValue({ data: [{ id: 'farm1', name: 'Sunrise Farm' }] });
    mockHasPermission.mockReturnValue(true);
  });

  it('renders workers with full name, position and status', async () => {
    render(<WorkersScreen />);

    expect(await screen.findByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Jane Smith')).toBeTruthy();
    // Position + department appear in the card meta.
    expect(screen.getByText(/Farm Hand/)).toBeTruthy();
  });

  it('shows a retryable connection error (not a false empty state) when the list fails', async () => {
    mockList.mockRejectedValue(NETWORK_ERROR);

    render(<WorkersScreen />);

    expect(await screen.findByText("Couldn't load workers")).toBeTruthy();
    expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    // The failure must not masquerade as genuinely-empty data.
    expect(screen.queryByText('No Workers Yet')).toBeNull();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('filters workers by status', async () => {
    render(<WorkersScreen />);
    await screen.findByText('John Doe');

    fireEvent.press(screen.getByLabelText('Filter inactive workers'));

    expect(screen.queryByText('John Doe')).toBeNull();
    expect(screen.getByText('Jane Smith')).toBeTruthy();
  });

  it('shows the empty state when there are no workers', async () => {
    mockList.mockResolvedValue({ data: [] });

    render(<WorkersScreen />);

    expect(await screen.findByText('No Workers Yet')).toBeTruthy();
  });

  it('hides the add action without hr.write permission', async () => {
    mockHasPermission.mockImplementation((p: string) => p === 'hr.read');

    render(<WorkersScreen />);
    await screen.findByText('John Doe');

    expect(screen.queryByLabelText('Add new worker')).toBeNull();
  });
});
