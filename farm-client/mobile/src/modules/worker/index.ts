/**
 * Worker (Tasks) module — the task board.
 * Mirrors the admin portal's `worker` plan-module (Sidebar: "Tasks").
 *
 * Note: tasks are gated by the `worker` module; the people who execute them
 * (workers, roster, leave, attendance) live in the `hr` module.
 */
export { tasksAPI } from '../../services/api';
export { offlineTasksAPI } from '../../services/offlineApi';
export {
  tasksApi,
  useListTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
} from '../../store/api';
export type { Task, TaskStatus, TaskPriority } from '../../services/types';
