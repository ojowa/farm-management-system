import React from 'react';
import { configure, render, screen, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../../app/(app)/index';

// The first render of this screen in a cold test environment takes a few
// seconds to commit its (heavy) tree; give async queries headroom so they
// wait for the commit instead of timing out at the 1s default.
configure({ asyncUtilTimeout: 10000 });

// ─── API mocks ────────────────────────────────────────────────────────────────
// Every endpoint the dashboard batches together is stubbed individually so a
// single endpoint can be failed to exercise per-section error handling.

const mockFarmsList = jest.fn();
const mockCropsList = jest.fn();
const mockLivestockList = jest.fn();
const mockPoultryList = jest.fn();
const mockListSales = jest.fn();
const mockListExpenses = jest.fn();
const mockProfitSummary = jest.fn();
const mockListTasks = jest.fn();
const mockGetToday = jest.fn();
const mockNotifList = jest.fn();
const mockUnreadCount = jest.fn();
const mockShowError = jest.fn();

// Mutable redux stand-in: the screen selects `auth.user` and `sync.isOnline`.
const mockRootState: any = {
  auth: { user: { id: 'u1', fullName: 'Jane Farmer' } },
  sync: { isOnline: true },
};

// Mutable auth user returned by `useAuth()` — `usePermission` reads
// `user.permissions` from it to gate the quick-action create shortcuts.
const mockAuthUser: any = { id: 'u1', fullName: 'Jane Farmer', permissions: [] };

// The dashboard now imports each API from its owning module (mirroring the
// admin portal's module taxonomy), so the mock targets those barrels instead
// of the raw @/services/api. Each factory fully replaces the barrel, so the
// module's re-exported offlineApi/RTK deps never load in this unit test.
jest.mock('@/modules/farm', () => ({
  farmsAPI: { list: (...args: any[]) => mockFarmsList(...args) },
}));
jest.mock('@/modules/crop', () => ({
  cropsAPI: { list: (...args: any[]) => mockCropsList(...args) },
}));
jest.mock('@/modules/livestock', () => ({
  livestockAPI: { list: (...args: any[]) => mockLivestockList(...args) },
}));
jest.mock('@/modules/poultry', () => ({
  poultryAPI: { list: (...args: any[]) => mockPoultryList(...args) },
}));
jest.mock('@/modules/finance', () => ({
  financeAPI: {
    listSales: (...args: any[]) => mockListSales(...args),
    listExpenses: (...args: any[]) => mockListExpenses(...args),
  },
  profitabilityAPI: { summary: (...args: any[]) => mockProfitSummary(...args) },
}));
jest.mock('@/modules/worker', () => ({
  tasksAPI: { list: (...args: any[]) => mockListTasks(...args) },
}));
jest.mock('@/modules/hr', () => ({
  attendanceAPI: { getToday: (...args: any[]) => mockGetToday(...args) },
}));
jest.mock('@/modules/notification', () => ({
  notificationsAPI: {
    list: (...args: any[]) => mockNotifList(...args),
    unreadCount: (...args: any[]) => mockUnreadCount(...args),
  },
}));

jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAppSelector: (selector: any) => selector(mockRootState),
  useAuth: () => ({ logout: jest.fn(), user: mockAuthUser }),
}));

jest.mock('@/core/hooks/useToasts', () => ({
  useToasts: () => ({
    toasts: [],
    showToast: jest.fn(),
    removeToast: jest.fn(),
    clearToasts: jest.fn(),
    success: jest.fn(),
    error: mockShowError,
    info: jest.fn(),
    warning: jest.fn(),
  }),
}));

jest.mock('@/core/theme/ThemeContext', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      background: '#F9FAFB',
      headerBg: '#166534',
      primary: '#16A34A',
      text: '#111827',
      textSecondary: '#6B7280',
      card: '#FFFFFF',
      border: '#E5E7EB',
    },
  }),
}));

// The screen loads via useFocusEffect (which also fires on mount); mirror that
// with a plain effect so the fetch kicks off during render.
jest.mock('expo-router', () => {
  const react = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useFocusEffect: (cb: any) => react.useEffect(cb, [cb]),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const NETWORK_ERROR = new Error('Network Error');
const CONNECTION_COPY = 'No connection. Check your network and try again.';

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockRootState.sync.isOnline = true;
    mockAuthUser.permissions = [];
    mockFarmsList.mockResolvedValue({ data: [{ id: 'f1', status: 'active' }] });
    mockCropsList.mockResolvedValue({ data: [{ id: 'c1' }, { id: 'c2' }] });
    mockLivestockList.mockResolvedValue({ data: [{ id: 'l1', quantity: 12 }] });
    mockPoultryList.mockResolvedValue({ data: [{ id: 'p1', quantity: 30 }] });
    mockListSales.mockResolvedValue({
      data: [{ id: 's1', item: 'Maize', quantity: 10, price: 5, total: 50 }],
    });
    mockListExpenses.mockResolvedValue({ data: [] });
    // The profitability endpoint is the primary financial source; by default
    // pretend it is unavailable so the client-side sales/expenses fallback
    // path is exercised unless a test explicitly overrides it.
    mockProfitSummary.mockRejectedValue(NETWORK_ERROR);
    mockListTasks.mockResolvedValue({ data: [] });
    mockGetToday.mockResolvedValue({ data: [] });
    mockNotifList.mockResolvedValue({ data: [] });
    mockUnreadCount.mockResolvedValue({ data: { count: 0 } });
  });

  it('falls back to sales/expenses sums and splits livestock from poultry', async () => {
    mockGetToday.mockResolvedValue({
      data: [{ status: 'PRESENT' }, { status: 'PRESENT' }, { status: 'ABSENT' }, { status: 'LATE' }],
    });

    render(<DashboardScreen />);

    // Regression: the old code filtered financeAPI.list() (raw expenses +
    // sales) for `type === 'income'`, a field neither raw shape carries —
    // so revenue was always $0 regardless of sales. With the profitability
    // endpoint unavailable, income falls back to the summed sales rows.
    expect(await screen.findByLabelText('Total Income: $50')).toBeTruthy();
    expect(screen.getByLabelText('Total Expenses: $0')).toBeTruthy();
    expect(screen.getByLabelText('Net Profit: $50')).toBeTruthy();

    // Livestock and poultry are now separate stats (admin parity).
    expect(screen.getByLabelText('Livestock: 12')).toBeTruthy();
    expect(screen.getByLabelText('Poultry: 30')).toBeTruthy();

    // Attendance shows the previously-dropped Late count and the total.
    expect(screen.getByLabelText('Late: 1')).toBeTruthy();
    expect(screen.getByLabelText('Total records today: 4')).toBeTruthy();

    // One absent worker raises an operational alert (admin parity).
    expect(screen.getByText('Workers absent today')).toBeTruthy();
  });

  it('shows retryable connection errors instead of empty-state cards when sections fail', async () => {
    mockListTasks.mockRejectedValue(NETWORK_ERROR);
    mockGetToday.mockRejectedValue(NETWORK_ERROR);
    mockNotifList.mockRejectedValue(NETWORK_ERROR);

    render(<DashboardScreen />);

    expect(await screen.findByText('Couldn’t load tasks')).toBeTruthy();
    expect(screen.getByText('Couldn’t load attendance')).toBeTruthy();
    expect(screen.getByText('Couldn’t load activity')).toBeTruthy();
    expect(screen.getAllByText(CONNECTION_COPY)).toHaveLength(3);

    // The failure must not masquerade as genuinely-empty data.
    expect(screen.queryByText('No pending tasks')).toBeNull();
    expect(screen.queryByText('No attendance data')).toBeNull();
    expect(screen.queryByText('No recent activity')).toBeNull();

    // Core sections still render, and silent failures stay silent (no toast).
    expect(screen.getByLabelText('Active Farms: 1')).toBeTruthy();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('blanks the financial summary with a retry notice when every finance request fails', async () => {
    mockListSales.mockRejectedValue(NETWORK_ERROR);
    mockListExpenses.mockRejectedValue(NETWORK_ERROR);
    mockProfitSummary.mockRejectedValue(NETWORK_ERROR);

    render(<DashboardScreen />);

    // Income / expenses / net all blank out rather than rendering $0.
    expect((await screen.findAllByText('—')).length).toBeGreaterThanOrEqual(3);
    // describeApiError maps the network failure to the connection copy;
    // the fallback string only appears for non-network errors.
    expect(screen.getAllByText(CONNECTION_COPY).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('reloads automatically when connectivity returns', async () => {
    mockRootState.sync.isOnline = false;
    mockListTasks
      .mockRejectedValueOnce(NETWORK_ERROR)
      .mockResolvedValue({ data: [] });

    const { rerender } = render(<DashboardScreen />);
    expect(await screen.findByText('Couldn’t load tasks')).toBeTruthy();

    // NetInfo flips back to online — the screen should self-heal without a
    // manual retry, clearing the error card.
    mockRootState.sync.isOnline = true;
    rerender(<DashboardScreen />);

    await waitFor(() => expect(mockListTasks).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No pending tasks')).toBeTruthy();
  });

  it('prefers the profitability summary and gates quick actions by permission', async () => {
    mockAuthUser.permissions = ['farm.write', 'finance.write'];
    mockProfitSummary.mockResolvedValue({
      data: { totalRevenue: 800, totalExpenses: 300, netProfit: 500 },
    });

    render(<DashboardScreen />);

    // The backend profitability summary wins over the client-side sums.
    expect(await screen.findByLabelText('Total Income: $800')).toBeTruthy();
    expect(screen.getByLabelText('Total Expenses: $300')).toBeTruthy();
    expect(screen.getByLabelText('Net Profit: $500')).toBeTruthy();

    // Quick actions only show the shortcuts the signed-in user may use.
    expect(screen.getByText('Quick Actions')).toBeTruthy();
    expect(screen.getByText('Add Farm')).toBeTruthy();
    expect(screen.getByText('Record Transaction')).toBeTruthy();
    expect(screen.queryByText('Add Worker')).toBeNull();
    expect(screen.queryByText('Add Livestock')).toBeNull();
  });
});
