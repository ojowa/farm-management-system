import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TaskLinkFields, TaskLinkChange } from '../modules/worker/TaskLinkFields';
import { DepartmentField } from '../modules/worker/DepartmentField';
import WorkersScreen from '../../app/(app)/workers';

// ─── API mocks ────────────────────────────────────────────────────────────────
// Both pickers load GET /departments themselves; the link picker then loads
// whichever record list its module chip chose. The workers list is the third
// consumer: its filter row prefers GET /departments over the legacy
// distinct-of-workers endpoint.

const mockDeptList = jest.fn();
const mockWorkerDepartments = jest.fn();
const mockCyclesList = jest.fn();
const mockFarmsList = jest.fn();
const mockWorkersList = jest.fn();
const mockFarmsApiList = jest.fn();
const mockHasPermission = jest.fn();
const mockPush = jest.fn();

let mockParams: Record<string, string> = {};

jest.mock('@/services/api', () => ({
  departmentsAPI: { list: (...a: any[]) => mockDeptList(...a) },
  farmsAPI: { list: (...a: any[]) => mockFarmsApiList(...a) },
  cropsAPI: { listCycles: (...a: any[]) => mockCyclesList(...a) },
  livestockAPI: { list: jest.fn() },
  poultryHousesAPI: { list: jest.fn() },
  aquacultureAPI: { listPonds: jest.fn() },
  equipmentAPI: { list: jest.fn() },
}));

jest.mock('@/modules/hr', () => ({
  workersAPI: {
    list: (...a: any[]) => mockWorkersList(...a),
    departments: (...a: any[]) => mockWorkerDepartments(...a),
  },
  departmentsAPI: { list: (...a: any[]) => mockDeptList(...a) },
}));

jest.mock('@/modules/farm', () => ({
  farmsAPI: { list: (...a: any[]) => mockFarmsList(...a), get: jest.fn() },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: mockHasPermission,
    canCreate: (domain: string) => mockHasPermission(`${domain}.write`),
  }),
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
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const DEPARTMENTS = [
  { id: 'd1', name: 'Dairy' },
  { id: 'd2', name: 'Poultry' },
];

/** Keeps the pickers controlled the way the task form holds them. */
function LinkHarness() {
  const [departmentId, setDepartmentId] = useState('');
  const [link, setLink] = useState<TaskLinkChange>({
    linkedModule: '',
    linkedRecordId: '',
    linkedRecordName: null,
  });
  return (
    <TaskLinkFields
      departmentId={departmentId}
      onDepartmentChange={setDepartmentId}
      linkedModule={link.linkedModule}
      linkedRecordId={link.linkedRecordId}
      linkedRecordName={link.linkedRecordName}
      onLinkChange={setLink}
    />
  );
}

describe('TaskLinkFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeptList.mockResolvedValue({ data: DEPARTMENTS });
    mockCyclesList.mockResolvedValue({ data: [] });
  });

  it('offers a department chip row including "None"', async () => {
    const onChange = jest.fn();
    render(
      <TaskLinkFields
        departmentId=""
        onDepartmentChange={onChange}
        linkedModule=""
        linkedRecordId=""
        onLinkChange={jest.fn()}
      />
    );

    expect(await screen.findByText('Dairy')).toBeTruthy();
    expect(screen.getByText('Poultry')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('No department'));
    expect(onChange).toHaveBeenCalledWith('');

    fireEvent.press(screen.getByLabelText('Department Poultry'));
    expect(onChange).toHaveBeenCalledWith('d2');
  });

  it('stages a module chip first, then completes the link with a record chip', async () => {
    mockCyclesList.mockResolvedValue({ data: [{ id: 'c1', cropName: 'Wheat', fieldName: 'East' }] });

    render(<LinkHarness />);

    fireEvent.press(await screen.findByLabelText('Link module Crop cycle'));
    // Stage only: no record picked yet, so the server keeps the triple empty.
    expect(screen.queryByLabelText('Link record Wheat · East')).toBeNull();

    expect(await screen.findByText('Wheat · East')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Link record Wheat · East'));

    fireEvent.press(screen.getByText('No link'));
    expect(screen.queryByLabelText('Link record Wheat · East')).toBeNull();

    // Re-select and confirm the record chip can be chosen again after a clear.
    fireEvent.press(screen.getByLabelText('Link module Crop cycle'));
    fireEvent.press(await screen.findByLabelText('Link record Wheat · East'));
    expect(screen.getByLabelText('Link record Wheat · East')).toBeTruthy();
  });

  it('clears the whole triple through "No link" (server re-normalises on nulls)', async () => {
    const onLinkChange = jest.fn();
    render(
      <TaskLinkFields
        departmentId="d1"
        onDepartmentChange={jest.fn()}
        linkedModule="livestock"
        linkedRecordId="an1"
        linkedRecordName="Bessie"
        onLinkChange={onLinkChange}
      />
    );

    fireEvent.press(screen.getByText('No link'));

    expect(onLinkChange).toHaveBeenCalledWith({
      linkedModule: '',
      linkedRecordId: '',
      linkedRecordName: null,
    });
  });
});

describe('DepartmentField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeptList.mockResolvedValue({ data: DEPARTMENTS });
  });

  it('picks a known department row by id', async () => {
    const onChange = jest.fn();
    render(<DepartmentField value="" departmentId="" onChange={onChange} />);

    fireEvent.press(await screen.findByLabelText('Department Dairy'));

    expect(onChange).toHaveBeenCalledWith({ department: 'Dairy', departmentId: 'd1' });
  });

  it('falls back to free text through "Other…" (the server resolves names too)', async () => {
    const onChange = jest.fn();
    render(<DepartmentField value="" departmentId="" onChange={onChange} />);

    fireEvent.press(await screen.findByText('Other…'));
    expect(onChange).toHaveBeenCalledWith({ department: '', departmentId: '' });

    fireEvent.changeText(screen.getByPlaceholderText('Type a department name'), 'Night Shift');
    expect(onChange).toHaveBeenCalledWith({ department: 'Night Shift', departmentId: '' });
  });

  it('degrades to the plain text input when /departments is unreachable', async () => {
    mockDeptList.mockRejectedValue(new Error('Network Error'));

    render(<DepartmentField value="Dairy" departmentId="" onChange={jest.fn()} />);

    expect(await screen.findByPlaceholderText('e.g. Dairy')).toBeTruthy();
    expect(screen.queryByText('Other…')).toBeNull();
  });
});

describe('Workers screen department filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockWorkersList.mockResolvedValue({ data: [] });
    mockFarmsList.mockResolvedValue({ data: [] });
    mockDeptList.mockResolvedValue({ data: DEPARTMENTS });
    mockWorkerDepartments.mockResolvedValue({ data: ['Legacy Dept'] });
    mockHasPermission.mockReturnValue(true);
  });

  it('prefers GET /departments for its chips over the legacy distinct endpoint', async () => {
    render(<WorkersScreen />);

    expect(await screen.findByText('Dairy')).toBeTruthy();
    expect(screen.getByText('Poultry')).toBeTruthy();
    expect(mockWorkerDepartments).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Filter by department Poultry'));
    expect(mockWorkersList).toHaveBeenLastCalledWith(
      expect.objectContaining({ department: 'Poultry' })
    );
  });

  it('falls back to the legacy departments endpoint when /departments fails', async () => {
    mockDeptList.mockRejectedValue(new Error('Network Error'));

    render(<WorkersScreen />);

    expect(await screen.findByText('Legacy Dept')).toBeTruthy();
    expect(mockWorkerDepartments).toHaveBeenCalled();
  });

  it('seeds the filter from the ?department= route param a task row links with', async () => {
    mockParams = { department: 'Dairy' };

    render(<WorkersScreen />);
    expect(await screen.findByText('Dairy')).toBeTruthy();

    expect(mockWorkersList).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'Dairy' })
    );

    // Clearing the chip must stick — the stale route param must not re-apply.
    fireEvent.press(screen.getByLabelText('Filter by department Dairy'));
    expect(mockWorkersList).toHaveBeenLastCalledWith(expect.objectContaining({ department: undefined }));
  });
});
