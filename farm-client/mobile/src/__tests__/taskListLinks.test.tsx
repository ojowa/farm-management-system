import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TasksScreen from '../../app/(app)/tasks';
import TaskDetailScreen from '../../app/(app)/tasks/[id]';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The list screen reads offlineTasksAPI.list (GET /tasks) and writes through
// offlineTasksAPI.create; the picker inside the modal reads GET /departments
// and the record lists straight from the api module. The detail screen reads
// tasksAPI.get and resolves Task.departmentId through the hr barrel.

const mockList = jest.fn();
const mockCreate = jest.fn();
const mockGet = jest.fn();
const mockWorkersList = jest.fn();
const mockDeptList = jest.fn();
const mockCyclesList = jest.fn();
const mockLivestockList = jest.fn();
const mockHasPermission = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

// Route params are per-test: the link filter and newTask=1 both arrive here.
let mockParams: Record<string, string> = {};

jest.mock('@/modules/worker', () => ({
  tasksAPI: {
    get: (...a: any[]) => mockGet(...a),
    update: jest.fn(),
    delete: jest.fn(),
    addComment: jest.fn(),
    deleteComment: jest.fn(),
    addAttachment: jest.fn(),
    removeAttachment: jest.fn(),
  },
  offlineTasksAPI: {
    list: (...a: any[]) => mockList(...a),
    create: (...a: any[]) => mockCreate(...a),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/modules/hr', () => ({
  workersAPI: {
    list: (...a: any[]) => mockWorkersList(...a),
    names: (...a: any[]) => mockWorkersList(...a),
  },
  departmentsAPI: { list: (...a: any[]) => mockDeptList(...a) },
}));

// The picker and the link helpers import the api module directly (not the
// worker barrel), so the record lists have to be stubbed here as well.
jest.mock('@/services/api', () => ({
  departmentsAPI: { list: (...a: any[]) => mockDeptList(...a) },
  farmsAPI: { list: jest.fn() },
  cropsAPI: { listCycles: (...a: any[]) => mockCyclesList(...a) },
  livestockAPI: { list: (...a: any[]) => mockLivestockList(...a) },
  poultryHousesAPI: { list: jest.fn() },
  aquacultureAPI: { listPonds: jest.fn() },
  equipmentAPI: { list: jest.fn() },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: mockHasPermission,
    hasAnyPermission: mockHasPermission,
    canCreate: (domain: string) => mockHasPermission(`${domain}.write`),
    canDelete: (domain: string) => mockHasPermission(`${domain}.delete`),
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
      surface: '#FFFFFF',
      overlay: 'rgba(0,0,0,0.4)',
      error: '#DC2626',
      placeholder: '#9CA3AF',
      inputBg: '#FFFFFF',
      inputBorder: '#E5E7EB',
      inputText: '#111827',
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

const DEPARTMENTS = [
  { id: 'd1', name: 'Dairy' },
  { id: 'd2', name: 'Poultry' },
];

const LINKED_TASK = {
  id: 't1',
  title: 'Sow wheat',
  priority: 'HIGH',
  status: 'PENDING',
  assignedToName: 'John Doe',
  departmentId: 'd1',
  linkedModule: 'crop',
  linkedRecordId: 'c1',
  linkedRecordName: 'Wheat · East',
  isRecurring: false,
};

const DETAIL_TASK = {
  id: 't1',
  title: 'Sow wheat',
  priority: 'HIGH',
  status: 'PENDING',
  assignedToName: 'John Doe',
  departmentId: 'd1',
  linkedModule: 'crop',
  linkedRecordId: 'c1',
  linkedRecordName: 'Wheat · East',
  isRecurring: false,
};

describe('Tasks link filter + department', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockList.mockResolvedValue({ data: [LINKED_TASK] });
    mockCreate.mockResolvedValue({ data: { id: 't9' } });
    mockWorkersList.mockResolvedValue({ data: [] });
    mockDeptList.mockResolvedValue({ data: DEPARTMENTS });
    mockCyclesList.mockResolvedValue({ data: [] });
    mockLivestockList.mockResolvedValue({ data: [] });
    mockGet.mockResolvedValue({ data: DETAIL_TASK });
    mockHasPermission.mockReturnValue(true);
  });

  it('narrows the list from the card link badge and offers a clearable chip', async () => {
    render(<TasksScreen />);
    expect(await screen.findByText('Sow wheat')).toBeTruthy();
    expect(mockList).toHaveBeenCalledWith({});

    fireEvent.press(screen.getByLabelText('Filter by tasks linked to Wheat · East'));

    expect(await screen.findByText('🔗 Wheat · East ✕')).toBeTruthy();
    expect(mockList).toHaveBeenLastCalledWith({ linkedModule: 'crop', linkedRecordId: 'c1' });

    fireEvent.press(screen.getByLabelText('Clear linked record filter Wheat · East'));

    expect(screen.queryByLabelText('Clear linked record filter Wheat · East')).toBeNull();
    expect(mockList).toHaveBeenLastCalledWith({});
  });

  it('applies the linkedModule/linkedRecordId route params a record page links with', async () => {
    mockParams = { linkedModule: 'farm', linkedRecordId: 'f1', linkedRecordName: 'Sunrise Farm' };

    render(<TasksScreen />);
    expect(await screen.findByText('Sow wheat')).toBeTruthy();

    expect(screen.getByText('🔗 Sunrise Farm ✕')).toBeTruthy();
    expect(mockList).toHaveBeenCalledWith({ linkedModule: 'farm', linkedRecordId: 'f1' });
  });

  it('opens the form pre-linked from newTask=1 and sends department + link on create', async () => {
    mockParams = {
      linkedModule: 'livestock',
      linkedRecordId: 'an1',
      linkedRecordName: 'Bessie',
      newTask: '1',
    };

    render(<TasksScreen />);

    // The record's "＋ New task" lands straight in the form, link already set.
    expect(await screen.findByText('New Task')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('Task title'), 'Check water troughs');
    fireEvent.press(await screen.findByLabelText('Department Dairy'));

    fireEvent.press(screen.getByText('Create'));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Check water troughs',
        departmentId: 'd1',
        linkedModule: 'livestock',
        linkedRecordId: 'an1',
        linkedRecordName: 'Bessie',
      })
    );
  });

  it('clears the link triple (nulls) when the form is saved without a link', async () => {
    render(<TasksScreen />);
    await screen.findByText('Sow wheat');

    fireEvent.press(screen.getByLabelText('Create task'));
    expect(await screen.findByText('New Task')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Task title'), 'Unlinked task');
    fireEvent.press(screen.getByText('Create'));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentId: null,
        linkedModule: null,
        linkedRecordId: null,
        linkedRecordName: null,
      })
    );
  });
});

describe('Task detail link rows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { id: 't1' };
    mockGet.mockResolvedValue({ data: DETAIL_TASK });
    mockDeptList.mockResolvedValue({ data: DEPARTMENTS });
    mockList.mockResolvedValue({ data: [] });
    mockWorkersList.mockResolvedValue({ data: [] });
    mockHasPermission.mockReturnValue(true);
  });

  it('opens the department roster and the linked record from their rows', async () => {
    render(<TaskDetailScreen />);

    fireEvent.press(await screen.findByLabelText('Open department Dairy'));
    expect(mockPush).toHaveBeenCalledWith('/workers?department=Dairy');

    fireEvent.press(screen.getByLabelText('Open linked record Crop cycle · Wheat · East'));
    expect(mockPush).toHaveBeenCalledWith('/crops/c1');
  });

  it('renders the row as plain text when the task has no link', async () => {
    mockGet.mockResolvedValue({ data: { ...DETAIL_TASK, linkedModule: null, linkedRecordId: null, linkedRecordName: null } });

    render(<TaskDetailScreen />);

    // Without a record the row stays plain text — nothing to open.
    expect(await screen.findByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Linked record')).toBeTruthy();
    expect(screen.queryByLabelText(/Open linked record/)).toBeNull();
    // The department row still resolves its id to a name and stays tappable.
    expect(screen.getByLabelText('Open department Dairy')).toBeTruthy();
  });
});
