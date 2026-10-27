import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import RosterScreen from '../../app/(app)/roster';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The roster reads GET /shifts (+ assignments) and GET /departments for both
// the filter chip row and the shift form. The department filter is server-side
// — GET /shifts?departmentId= — so the assertion is on the listShifts call.

const mockListShifts = jest.fn();
const mockListAssignments = jest.fn();
const mockCreateShift = jest.fn();
const mockUpdateShift = jest.fn();
const mockDeptList = jest.fn();
const mockWorkersList = jest.fn();
const mockHasPermission = jest.fn();
const mockShowError = jest.fn();
const mockPush = jest.fn();

jest.mock('@/modules/hr', () => ({
  rosterAPI: {
    listShifts: (...a: any[]) => mockListShifts(...a),
    listAssignments: (...a: any[]) => mockListAssignments(...a),
    createShift: (...a: any[]) => mockCreateShift(...a),
    updateShift: (...a: any[]) => mockUpdateShift(...a),
    deleteShift: jest.fn(),
    deleteAssignment: jest.fn(),
  },
  workersAPI: {
    list: (...a: any[]) => mockWorkersList(...a),
    names: (...a: any[]) => mockWorkersList(...a),
  },
  departmentsAPI: { list: (...a: any[]) => mockDeptList(...a) },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: mockHasPermission,
    canCreate: (domain: string) => mockHasPermission(`${domain}.write`),
    canDelete: (domain: string) => mockHasPermission(`${domain}.delete`),
  }),
}));

jest.mock('@/core/hooks/useToasts', () => ({
  useToasts: () => ({
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
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const DEPARTMENTS = [
  { id: 'd1', name: 'Dairy' },
  { id: 'd2', name: 'Poultry' },
];

const SHIFTS = [
  {
    id: 's1',
    name: 'Morning',
    startTime: '08:00',
    endTime: '16:00',
    daysOfWeek: ['MON'],
    isActive: true,
    departmentId: 'd1',
  },
  { id: 's2', name: 'Evening', startTime: '16:00', endTime: '23:00', daysOfWeek: ['MON'], isActive: true },
];

describe('Roster departments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListShifts.mockResolvedValue({ data: SHIFTS });
    mockListAssignments.mockResolvedValue({ data: [] });
    mockDeptList.mockResolvedValue({ data: DEPARTMENTS });
    mockWorkersList.mockResolvedValue({ data: [] });
    mockCreateShift.mockResolvedValue({ data: { id: 's3' } });
    mockHasPermission.mockReturnValue(true);
  });

  it('re-queries the roster with ?departmentId= when a department chip is pressed', async () => {
    render(<RosterScreen />);

    expect(await screen.findByText('Morning')).toBeTruthy();
    expect(mockListShifts).toHaveBeenCalledWith(undefined);

    fireEvent.press(screen.getByLabelText('Filter by department Poultry'));

    expect(await screen.findByText('Evening')).toBeTruthy();
    expect(mockListShifts).toHaveBeenLastCalledWith({ departmentId: 'd2' });

    // Toggling the active chip again clears back to the unfiltered roster.
    fireEvent.press(screen.getByLabelText('Filter by department Poultry'));
    expect(mockListShifts).toHaveBeenLastCalledWith(undefined);
  });

  it('shows the owning department on a shift card', async () => {
    render(<RosterScreen />);

    expect(await screen.findByText('Department: Dairy')).toBeTruthy();
    // The second shift owns no department — no stray line for it.
    expect(screen.queryByText('Department: Poultry')).toBeNull();
  });

  it('sends the picked department (and null when cleared) in the shift payload', async () => {
    render(<RosterScreen />);
    await screen.findByText('Morning');

    fireEvent.press(screen.getByLabelText('Create new shift'));
    expect(await screen.findByRole('button', { name: 'Create Shift' })).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Morning'), 'Graveyard');
    fireEvent.changeText(screen.getByPlaceholderText('HH:MM (e.g. 08:00)'), '22:00');
    fireEvent.changeText(screen.getByPlaceholderText('HH:MM (e.g. 16:00)'), '06:00');
    fireEvent.press(screen.getByLabelText('Department Dairy'));

    fireEvent.press(screen.getByRole('button', { name: 'Create Shift' }));

    expect(mockCreateShift).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Graveyard',
        startTime: '22:00',
        endTime: '06:00',
        departmentId: 'd1',
      })
    );
  });

  it('sends departmentId: null when the form clears the department', async () => {
    render(<RosterScreen />);
    await screen.findByText('Morning');

    fireEvent.press(screen.getByLabelText('Create new shift'));
    expect(await screen.findByRole('button', { name: 'Create Shift' })).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Morning'), 'Anybody');
    fireEvent.changeText(screen.getByPlaceholderText('HH:MM (e.g. 08:00)'), '09:00');
    fireEvent.changeText(screen.getByPlaceholderText('HH:MM (e.g. 16:00)'), '17:00');
    // Pick, then clear — the server only writes the field it is given.
    fireEvent.press(screen.getByLabelText('Department Poultry'));
    fireEvent.press(screen.getByLabelText('No department'));

    fireEvent.press(screen.getByRole('button', { name: 'Create Shift' }));

    expect(mockCreateShift).toHaveBeenCalledWith(expect.objectContaining({ departmentId: null }));
  });

  it('keeps the shift form usable on a server without /departments', async () => {
    mockDeptList.mockRejectedValue(new Error('Network Error'));

    render(<RosterScreen />);
    await screen.findByText('Morning');

    // No chips, but the form still opens and validates.
    expect(screen.queryByLabelText('Filter by department Dairy')).toBeNull();
    fireEvent.press(screen.getByLabelText('Create new shift'));
    expect(await screen.findByRole('button', { name: 'Create Shift' })).toBeTruthy();
    expect(screen.queryByLabelText('Department Dairy')).toBeNull();
  });
});
