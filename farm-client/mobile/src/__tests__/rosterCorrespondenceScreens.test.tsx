import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import RosterScreen from '../../app/(app)/roster';
import CorrespondenceScreen from '../../app/(app)/correspondence';

// ─── API mocks ────────────────────────────────────────────────────────────────
// Roster loads shifts (rosterAPI.listShifts) plus assignment counts
// (rosterAPI.listAssignments); Correspondence loads correspondenceAPI.list.
// The assignments call is allowed to fail independently — the shift list must
// still render (partial-failure tolerance).

const mockListShifts = jest.fn();
const mockListAssignments = jest.fn();
const mockCreateShift = jest.fn();
const mockDeleteShift = jest.fn();
const mockListCorrespondence = jest.fn();
const mockHasPermission = jest.fn();
const mockShowError = jest.fn();
const mockSuccess = jest.fn();

jest.mock('@/modules/hr', () => ({
  rosterAPI: {
    listShifts: (...a: any[]) => mockListShifts(...a),
    listAssignments: (...a: any[]) => mockListAssignments(...a),
    createShift: (...a: any[]) => mockCreateShift(...a),
    deleteShift: (...a: any[]) => mockDeleteShift(...a),
  },
}));

jest.mock('@/modules/communication', () => ({
  correspondenceAPI: {
    list: (...a: any[]) => mockListCorrespondence(...a),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    unarchive: jest.fn(),
    delete: jest.fn(),
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
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const NETWORK_ERROR = new Error('Network Error');
const CONNECTION_COPY = 'No connection. Check your network and try again.';

const SHIFTS = [
  { id: 's1', name: 'Morning', startTime: '08:00', endTime: '16:00', isActive: true },
  { id: 's2', name: 'Evening', startTime: '16:00', endTime: '23:00', isActive: false },
];

const ASSIGNMENTS = [
  { id: 'a1', shiftId: 's1', userId: 'u1', date: '2026-10-19' },
  { id: 'a2', shiftId: 's1', userId: 'u2', date: '2026-10-19' },
];

const CORRESPONDENCE = [
  {
    id: 'c1',
    title: 'Water supply maintenance',
    referenceNumber: 'REF-001',
    type: 'INCOMING',
    category: 'NOTICE',
    status: 'RECEIVED',
    priority: 'HIGH',
    from: 'Town Council',
    to: 'Farm Office',
    receivedDate: '2026-10-01',
  },
  {
    // Legacy DTO shape: subject instead of title, archived boolean instead of
    // archivedAt — the screen must render both shapes.
    id: 'c2',
    subject: 'Old tractor service record',
    referenceNumber: 'REF-002',
    type: 'INTERNAL',
    status: 'SENT',
    archived: true,
    createdAt: '2026-09-12',
  },
];

describe('People screens (Roster + Correspondence)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListShifts.mockResolvedValue({ data: SHIFTS });
    mockListAssignments.mockResolvedValue({ data: ASSIGNMENTS });
    mockListCorrespondence.mockResolvedValue({ data: CORRESPONDENCE });
    mockHasPermission.mockReturnValue(true);
  });

  describe('RosterScreen', () => {
    it('renders shifts with times, active state and assignment counts', async () => {
      render(<RosterScreen />);

      expect(await screen.findByText('Morning')).toBeTruthy();
      expect(screen.getByText(/08:00/)).toBeTruthy();
      expect(screen.getByText('Evening')).toBeTruthy();
      expect(screen.getByText('Inactive')).toBeTruthy();
      // Assignment counts come from shiftId on the assignments feed.
      expect(screen.getByText('2 assignments')).toBeTruthy();
      expect(screen.getByText('0 assignments')).toBeTruthy();
    });

    it('still renders shifts when the assignments feed fails (partial failure)', async () => {
      mockListAssignments.mockRejectedValue(NETWORK_ERROR);

      render(<RosterScreen />);

      expect(await screen.findByText('Morning')).toBeTruthy();
      // Counts fall back to zero rather than blanking the screen.
      expect(screen.getAllByText('0 assignments')).toHaveLength(2);
    });

    it('shows a retryable connection error (not a false empty state) when shifts fail to load', async () => {
      mockListShifts.mockRejectedValue(NETWORK_ERROR);

      render(<RosterScreen />);

      expect(await screen.findByText("Couldn't load the roster")).toBeTruthy();
      expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
      expect(screen.queryByText('No Shifts Yet')).toBeNull();
    });

    it('shows the empty state when there are no shifts', async () => {
      mockListShifts.mockResolvedValue({ data: [] });
      mockListAssignments.mockResolvedValue({ data: [] });

      render(<RosterScreen />);

      expect(await screen.findByText('No Shifts Yet')).toBeTruthy();
    });

    it('hides the create action without hr.write', async () => {
      mockHasPermission.mockImplementation((p: string) => p === 'hr.read');

      render(<RosterScreen />);
      await screen.findByText('Morning');

      expect(screen.queryByLabelText('Create new shift')).toBeNull();
    });
  });

  describe('CorrespondenceScreen', () => {
    it('renders both record shapes (title and legacy subject)', async () => {
      render(<CorrespondenceScreen />);

      expect(await screen.findByText('Water supply maintenance')).toBeTruthy();
      expect(screen.getByText('Old tractor service record')).toBeTruthy();
      expect(screen.getByText(/Town Council → Farm Office/)).toBeTruthy();
    });

    it('filters archived correspondence using either shape', async () => {
      render(<CorrespondenceScreen />);
      await screen.findByText('Water supply maintenance');

      fireEvent.press(screen.getByLabelText('Filter archived correspondence'));

      // c2 is archived via the legacy `archived: true` boolean.
      expect(screen.queryByText('Water supply maintenance')).toBeNull();
      expect(screen.getByText('Old tractor service record')).toBeTruthy();
    });

    it('shows a retryable connection error (not a false empty state) when the list fails', async () => {
      mockListCorrespondence.mockRejectedValue(NETWORK_ERROR);

      render(<CorrespondenceScreen />);

      expect(await screen.findByText("Couldn't load correspondence")).toBeTruthy();
      expect(screen.getByText(CONNECTION_COPY)).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
      expect(screen.queryByText('No Correspondence Found')).toBeNull();
    });

    it('shows the empty state when there is no correspondence', async () => {
      mockListCorrespondence.mockResolvedValue({ data: [] });

      render(<CorrespondenceScreen />);

      expect(await screen.findByText('No Correspondence Found')).toBeTruthy();
    });

    it('hides the create action without hr.write', async () => {
      mockHasPermission.mockImplementation((p: string) => p === 'hr.read');

      render(<CorrespondenceScreen />);
      await screen.findByText('Water supply maintenance');

      expect(screen.queryByLabelText('Create new correspondence')).toBeNull();
    });
  });
});
