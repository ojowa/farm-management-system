/**
 * Worker (Tasks) module — the task board.
 * Mirrors the admin portal's `worker` plan-module (Sidebar: "Tasks").
 *
 * Note: tasks are gated by the `worker` module; the people who execute them
 * (workers, roster, leave, attendance) live in the `hr` module.
 */
export { tasksAPI } from '../../services/api';
export { offlineTasksAPI } from '../../services/offlineApi';
export { TaskLinkFields } from './TaskLinkFields';
export { DepartmentField } from './DepartmentField';
export { RecordTasksCard } from './RecordTasksCard';
export {
  linkedModuleLabel,
  linkedRecordHref,
  linkedTasksPath,
} from './taskLinks';
export type { LinkedModule, RecordOption } from './taskLinks';
export {
  tasksApi,
  useListTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
} from '../../store/api';
export type { Task, TaskStatus, TaskPriority, TaskComment, TaskAttachment } from '../../services/types';
