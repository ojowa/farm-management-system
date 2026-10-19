/**
 * HR module — the workforce: workers, roster/shifts, leave and attendance.
 * Mirrors the admin portal's `hr` plan-module (Sidebar: "Workers", "Roster",
 * "Leave"; attendance is a child view of Workers).
 *
 * Previously attendance lived in its own module and workers/roster/leave were
 * bundled into the old `task` module. They are now correctly split: `worker`
 * owns tasks, `hr` owns the people.
 */
export { workersAPI, rosterAPI, leaveAPI, attendanceAPI } from '../../services/api';
export { offlineAttendanceAPI } from '../../services/offlineApi';
export type {
  Worker,
  CreateWorkerRequest,
  Shift,
  ShiftAssignment,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  Attendance,
  AttendanceStatus,
  ClockInRequest,
} from '../../services/types';
