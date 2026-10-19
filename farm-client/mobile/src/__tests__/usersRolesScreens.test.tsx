import React from 'react';
import { render, screen } from '@testing-library/react-native';
import UsersScreen from '../../app/(app)/users';
import RolesScreen from '../../app/(app)/roles';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The Users list loads both the team (orgAdminAPI.listUsers) and the roles for
// the invite modal (orgAdminAPI.listRoles); Roles only loads listRoles. Both
// endpoints are stubbed so either can be failed to exercise the retryable
// error path.

const mockListUsers = jest.fn();
const mockListRoles = jest.fn();
const mockInviteUser = jest.fn();
const mockRemoveUser = jest.fn();
const mockCreateRole = jest.fn();
const mockHasPermission = jest.fn();
const mockShowError = jest.fn();
const mockSuccess = jest.fn();
const mockPush = jest.fn();

jest.mock('@/modules/settings', () => ({
  orgAdminAPI: {
    listUsers: (...a: any[]) => mockListUsers(...a),
    listRoles: (...a: any[]) => mockListRoles(...a),
    inviteUser: (...a: any[]) => mockInviteUser(...a),
    removeUser: (...a: any[]) => mockRemoveUser(...a),
    createRole: (...a: any[]) => mockCreateRole(...a),
    getRole: jest.fn(),
    deleteRole: jest.fn(),
  },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: mockHasPermission }),
}));

jest.mock('@/core/hooks/useToasts', () => ({
  useToasts: () => ({
    success: mockSuccess,
    error: mockShowError,
    info: jest.fn(),
    warning: jest.fn(),
  }),
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

const USERS = [
  {
    id: 'u1',
    fullName: 'Jane Farmer',
    firstName: 'Jane',
    lastName: 'Farmer',
    email: 'jane@example.com',
    role: 'owner',
  },
  {
    id: 'u2',
    fullName: 'John Worker',
    firstName: 'John',
    lastName: 'Worker',
    email: 'john@example.com',
    role: 'worker',
  },
];

const ROLES = [
  { id: 'r1', name: 'Manager', description: 'Full access', permissions: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }] },
  { id: 'r2', name: 'Field Hand', description: 'Field tasks only', permissions: [] },
];

describe('Access screens (Users + Roles)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListUsers.mockResolvedValue({ data: USERS });
    mockListRoles.mockResolvedValue({ data: ROLES });
    mockHasPermission.mockReturnValue(true);
  });

  describe('UsersScreen', () => {
    it('renders team members with name, email and role', async () => {
      render(<UsersScreen />);

      expect(await screen.findByText('Jane Farmer')).toBeTruthy();
      expect(screen.getByText('jane@example.com')).toBeTruthy();
      expect(screen.getByText('John Worker')).toBeTruthy();
      expect(screen.getByText('john@example.com')).toBeTruthy();
    });

    it('shows a retryable connection error (not a false empty state) when the team fails to load', async () => {
      mockListUsers.mockRejectedValue(NETWORK_ERROR);

      render(<UsersScreen />);

      expect(await screen.findByText("Couldn't load users")).toBeTruthy();
      expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();

      // The failure must not masquerade as genuinely-empty data.
      expect(screen.queryByText('No Users Found')).toBeNull();
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('shows the empty state when the organisation has no users', async () => {
      mockListUsers.mockResolvedValue({ data: [] });

      render(<UsersScreen />);

      expect(await screen.findByText('No Users Found')).toBeTruthy();
    });

    it('hides invite and remove actions without users.manage', async () => {
      mockHasPermission.mockImplementation((p: string) => p === 'users.read');

      render(<UsersScreen />);
      await screen.findByText('Jane Farmer');

      expect(screen.queryByLabelText('Invite new user')).toBeNull();
      expect(screen.queryByLabelText('Remove Jane Farmer')).toBeNull();
    });
  });

  describe('RolesScreen', () => {
    it('renders roles with their permission counts', async () => {
      render(<RolesScreen />);

      expect(await screen.findByText('Manager')).toBeTruthy();
      expect(screen.getByText('3 perms')).toBeTruthy();
      expect(screen.getByText('Field Hand')).toBeTruthy();
      expect(screen.getByText('0 perms')).toBeTruthy();
    });

    it('shows a retryable connection error when roles fail to load', async () => {
      mockListRoles.mockRejectedValue(NETWORK_ERROR);

      render(<RolesScreen />);

      expect(await screen.findByText("Couldn't load roles")).toBeTruthy();
      expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
      expect(screen.queryByText('No Roles Found')).toBeNull();
    });

    it('shows the empty state when there are no roles', async () => {
      mockListRoles.mockResolvedValue({ data: [] });

      render(<RolesScreen />);

      expect(await screen.findByText('No Roles Found')).toBeTruthy();
    });

    it('hides the create action without organization.manage', async () => {
      mockHasPermission.mockImplementation((p: string) => p === 'organization.read');

      render(<RolesScreen />);
      await screen.findByText('Manager');

      expect(screen.queryByLabelText('Create new role')).toBeNull();
    });
  });
});
