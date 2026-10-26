import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RecordTasksCard } from '../modules/worker/RecordTasksCard';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The panel asks GET /tasks for exactly the rows linked to one record
// (linkedModule + linkedRecordId, server-side) and, on a farm page, GET /
// workers?limit=1 for the headcount carried by `total`.

const mockTasksList = jest.fn();
const mockWorkersList = jest.fn();
const mockCanCreate = jest.fn();
const mockPush = jest.fn();

jest.mock('@/services/api', () => ({
  tasksAPI: { list: (...a: any[]) => mockTasksList(...a) },
  workersAPI: { list: (...a: any[]) => mockWorkersList(...a) },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({ canCreate: mockCanCreate }),
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
      error: '#DC2626',
    },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const task = (n: number, overrides: any = {}) => ({
  id: `t${n}`,
  title: `Task ${n}`,
  status: 'PENDING',
  priority: 'MEDIUM',
  assignedToName: 'John Doe',
  ...overrides,
});

describe('RecordTasksCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTasksList.mockResolvedValue({ data: [] });
    mockWorkersList.mockResolvedValue({ data: { total: 12 } });
    mockCanCreate.mockReturnValue(true);
  });

  it('queries server-side by linkedModule + linkedRecordId and shows the empty state', async () => {
    render(<RecordTasksCard moduleKey="farm" recordId="f1" recordName="Sunrise Farm" />);

    expect(await screen.findByText('No tasks linked to Sunrise Farm')).toBeTruthy();
    expect(mockTasksList).toHaveBeenCalledWith({
      linkedModule: 'farm',
      linkedRecordId: 'f1',
      limit: 20,
    });
    // No rows means no "open" tally to report.
    expect(screen.queryByText(/open$/)).toBeNull();
  });

  it('shows at most five rows and counts every open task behind "View all"', async () => {
    const rows = [
      ...Array.from({ length: 6 }, (_, i) => task(i + 1)),
      task(7, { status: 'COMPLETED' }),
    ];
    mockTasksList.mockResolvedValue({ data: rows });

    render(<RecordTasksCard moduleKey="crop" recordId="c1" recordName="Wheat · East" />);

    expect(await screen.findByText('Task 1')).toBeTruthy();
    expect(screen.getByText('Task 5')).toBeTruthy();
    expect(screen.queryByText('Task 6')).toBeNull();

    // 6 of the 7 are still open — the pill reads the whole page, not the slice.
    expect(screen.getByText('6 open')).toBeTruthy();
    expect(screen.queryByText('No tasks linked to Wheat · East')).toBeNull();
  });

  it('routes rows to the task detail and "View all" to the filtered list', async () => {
    mockTasksList.mockResolvedValue({ data: [task(1)] });

    render(<RecordTasksCard moduleKey="farm" recordId="f1" recordName="Sunrise Farm" />);
    await screen.findByText('Task 1');

    fireEvent.press(screen.getByLabelText('Open task Task 1'));
    expect(mockPush).toHaveBeenCalledWith('/tasks/t1');

    fireEvent.press(screen.getByLabelText('View all linked tasks'));
    expect(mockPush).toHaveBeenCalledWith(
      '/tasks?linkedModule=farm&linkedRecordId=f1&linkedRecordName=Sunrise%20Farm'
    );
  });

  it('reports the farm headcount only when a farmId is given', async () => {
    const { unmount } = render(
      <RecordTasksCard moduleKey="farm" recordId="f1" recordName="Sunrise Farm" farmId="f1" />
    );

    expect(await screen.findByText('12 workers')).toBeTruthy();
    expect(mockWorkersList).toHaveBeenCalledWith({ farmId: 'f1', limit: 1 });

    unmount();
    jest.clearAllMocks();
    mockTasksList.mockResolvedValue({ data: [] });
    mockWorkersList.mockResolvedValue({ data: { total: 12 } });

    render(<RecordTasksCard moduleKey="equipment" recordId="e1" recordName="Tractor" />);
    await screen.findByText('No tasks linked to Tractor');

    expect(screen.queryByText(/workers/)).toBeNull();
    expect(mockWorkersList).not.toHaveBeenCalled();
  });

  it('gates "＋ New task" on hr write permission', async () => {
    mockCanCreate.mockReturnValue(false);

    render(<RecordTasksCard moduleKey="farm" recordId="f1" recordName="Sunrise Farm" />);
    await screen.findByText('No tasks linked to Sunrise Farm');

    expect(screen.queryByText('＋ New task')).toBeNull();
  });

  it('surfaces a load failure as a retryable error, not an empty state', async () => {
    mockTasksList.mockRejectedValueOnce(new Error('Network Error'));

    render(<RecordTasksCard moduleKey="farm" recordId="f1" recordName="Sunrise Farm" />);

    expect(await screen.findByLabelText('Retry loading tasks')).toBeTruthy();
    expect(screen.queryByText('No tasks linked to Sunrise Farm')).toBeNull();

    mockTasksList.mockResolvedValue({ data: [task(1)] });
    fireEvent.press(screen.getByLabelText('Retry loading tasks'));

    expect(await screen.findByText('Task 1')).toBeTruthy();
  });
});
