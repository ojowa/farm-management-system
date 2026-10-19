import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Sidebar } from '@/core/ui/Sidebar';
import { SidebarContext } from '@/core/navigation/SidebarContext';

// ─── Router + auth mocks ──────────────────────────────────────────────────────
// The sidebar reads the current pathname (active-item highlight) and pushes
// routes on tap; the auth user drives both permission gating (via
// usePermission -> useAuth) and the plan-module gate (via useAppSelector).

const mockPush = jest.fn();
const mockClose = jest.fn();
let mockPathname = '/';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => mockPathname,
  useSegments: () => [],
  Stack: { Screen: () => null },
}));

let mockUser: any = null;
jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAppSelector: (selector: any) => selector({ auth: { user: mockUser } }),
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('@/core/theme/ThemeContext', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      surface: '#FFFFFF',
      text: '#424242',
      textSecondary: '#757575',
      borderLight: '#E0E0E0',
      primary: '#2E7D32',
      textInverse: '#FFFFFF',
    },
  }),
}));

// The 12 canonical plan modules (admin's MODULE_OPTIONS).
const FULL_MODULES = [
  'farm',
  'crop',
  'livestock',
  'poultry',
  'aquaculture',
  'inventory',
  'finance',
  'worker',
  'communication',
  'reporting',
  'notification',
  'hr',
];

const ADMIN_SECTION_LABELS = [
  'Overview',
  'Access',
  'Farming',
  'Assets',
  'People',
  'Money',
  'Insights',
  'System',
];

function makeUser(overrides: any = {}) {
  return {
    id: 'u1',
    firstName: 'Jane',
    lastName: 'Farmer',
    fullName: 'Jane Farmer',
    role: 'owner',
    email: 'jane@example.com',
    permissions: ['*'],
    planFeatures: { modules: FULL_MODULES, farmTypes: [] },
    ...overrides,
  };
}

function renderSidebar() {
  return render(
    <SidebarContext.Provider value={{ open: jest.fn(), close: mockClose }}>
      <Sidebar />
    </SidebarContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/';
  mockUser = makeUser();
});

describe('Sidebar', () => {
  it('mirrors the admin portal: all 8 section headings and 23 items', () => {
    renderSidebar();

    for (const label of ADMIN_SECTION_LABELS) {
      expect(screen.getByText(label)).toBeTruthy();
    }

    // Every admin nav item is represented — all now backed by real screens.
    const allItems = [
      'Dashboard', 'Users', 'Roles',
      'Farms', 'Crops', 'Livestock', 'Poultry', 'Aquaculture',
      'Inventory', 'Equipment',
      'Workers', 'Roster', 'Tasks', 'Leave', 'Messages', 'Correspondence',
      'Finance', 'Contracts', 'Marketplace',
      'Reports', 'Weather',
      'Subscription', 'Settings',
    ];
    expect(allItems).toHaveLength(23);
    for (const item of allItems) {
      expect(screen.getByLabelText(item)).toBeTruthy();
    }
  });

  it('displays every item as enabled now that all admin items have screens', () => {
    renderSidebar();

    // A fully-permitted owner sees every section. All 23 admin items now have
    // a mobile screen, so nothing renders the "Not on mobile" badge …
    expect(screen.queryByText('Not on mobile')).toBeNull();

    // … and every item stays tappable.
    const allItems = [
      'Dashboard', 'Users', 'Roles',
      'Farms', 'Crops', 'Livestock', 'Poultry', 'Aquaculture',
      'Inventory', 'Equipment',
      'Workers', 'Roster', 'Tasks', 'Leave', 'Messages', 'Correspondence',
      'Finance', 'Contracts', 'Marketplace',
      'Reports', 'Weather',
      'Subscription', 'Settings',
    ];
    for (const label of allItems) {
      expect(screen.getByLabelText(label).props.accessibilityState?.disabled).toBe(false);
    }

    // Newly-enabled items navigate to their new screens.
    fireEvent.press(screen.getByLabelText('Users'));
    expect(mockPush).toHaveBeenCalledWith('/users');
    expect(mockClose).toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Marketplace'));
    expect(mockPush).toHaveBeenCalledWith('/marketplace');

    fireEvent.press(screen.getByLabelText('Weather'));
    expect(mockPush).toHaveBeenCalledWith('/weather');
  });

  it('navigates to the item route and closes the drawer on tap', () => {
    mockPathname = '/';
    renderSidebar();

    fireEvent.press(screen.getByLabelText('Farms'));
    expect(mockPush).toHaveBeenCalledWith('/farms');
    expect(mockClose).toHaveBeenCalled();

    // Inventory is only a sub-view on mobile; it routes there.
    fireEvent.press(screen.getByLabelText('Inventory'));
    expect(mockPush).toHaveBeenCalledWith('/inventory/low-stock');
    expect(mockClose).toHaveBeenCalled();
  });

  it('gates items by permission and plan module exactly like the admin sidebar', () => {
    mockUser = makeUser({
      role: 'worker',
      // Worker-ish grants: no users.manage / hr.* / finance.* anywhere.
      permissions: ['farm.read', 'crop.read', 'communication.read'],
      planFeatures: { modules: ['farm', 'crop', 'communication'], farmTypes: [] },
    });
    renderSidebar();

    // Access (Users/Roles) disappears: no users.manage or role.read.
    expect(screen.queryByText('Access')).toBeNull();
    expect(screen.queryByLabelText('Users')).toBeNull();
    expect(screen.queryByLabelText('Roles')).toBeNull();

    // Plan-module gate hides Livestock (module not subscribed) …
    expect(screen.queryByLabelText('Livestock')).toBeNull();
    // … and permission gate hides Finance (no finance.read).
    expect(screen.queryByLabelText('Finance')).toBeNull();
    // Owner-only billing entry stays hidden without billing.manage.
    expect(screen.queryByLabelText('Subscription')).toBeNull();

    // What the worker can reach stays visible.
    expect(screen.getByLabelText('Farms')).toBeTruthy();
    expect(screen.getByLabelText('Crops')).toBeTruthy();
    expect(screen.getByLabelText('Messages')).toBeTruthy();
    expect(screen.getByLabelText('Settings')).toBeTruthy();
  });

  it('treats an empty plan module list as "unknown", hiding nothing (matches admin)', () => {
    // /auth/me returns modules: [] when no plan is linked — that must never
    // blank the nav (the bug the admin sidebar documents).
    mockUser = makeUser({
      permissions: ['*'],
      planFeatures: { modules: [], farmTypes: [] },
    });
    renderSidebar();

    expect(screen.getByLabelText('Farms')).toBeTruthy();
    expect(screen.getByLabelText('Poultry')).toBeTruthy();
    expect(screen.getByLabelText('Livestock')).toBeTruthy();
    expect(screen.getByLabelText('Aquaculture')).toBeTruthy();
  });
});
