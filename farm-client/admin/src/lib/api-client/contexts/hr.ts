import { AxiosInstance } from 'axios';

export interface WorkersAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  /** Rotate the worker's login password and resend their invitation email. */
  reinvite: (id: string) => Promise<any>;
}

export function createWorkersAPI(client: AxiosInstance): WorkersAPI {
  return {
    list: (params) => client.get('/workers', { params }),
    get: (id) => client.get(`/workers/${id}`),
    create: (data) => client.post('/workers', data),
    update: (id, data) => client.put(`/workers/${id}`, data),
    delete: (id) => client.delete(`/workers/${id}`),
    reinvite: (id) => client.post(`/workers/${id}/reinvite`),
  };
}

export interface TasksAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  updateStatus: (id: string, status: string) => Promise<any>;
  comments: (id: string) => Promise<any>;
  addComment: (id: string, body: string) => Promise<any>;
  deleteComment: (commentId: string) => Promise<any>;
  addAttachment: (id: string, data: { fileName: string; fileUrl: string; fileSize?: number }) => Promise<any>;
  removeAttachment: (attachmentId: string) => Promise<any>;
}

export function createTasksAPI(client: AxiosInstance): TasksAPI {
  return {
    list: (params) => client.get('/tasks', { params }),
    get: (id) => client.get(`/tasks/${id}`),
    create: (data) => client.post('/tasks', data),
    update: (id, data) => client.put(`/tasks/${id}`, data),
    delete: (id) => client.delete(`/tasks/${id}`),
    updateStatus: (id, status) => client.put(`/tasks/${id}/status`, { status }),
    comments: (id) => client.get(`/tasks/${id}/comments`),
    addComment: (id, body) => client.post(`/tasks/${id}/comments`, { body }),
    deleteComment: (commentId) => client.delete(`/tasks/comments/${commentId}`),
    addAttachment: (id, data) => client.post(`/tasks/${id}/attachments`, data),
    removeAttachment: (attachmentId) => client.delete(`/tasks/attachments/${attachmentId}`),
  };
}

export interface AttendanceAPI {
  list: (params?: any) => Promise<any>;
  getToday: () => Promise<any>;
  /** workerId omitted → org-wide summary (managers). */
  getSummary: (params: { workerId?: string; month?: number; year?: number }) => Promise<any>;
  create: (data: any) => Promise<any>;
  clockIn: (data: { workerId: string; workerName: string }) => Promise<any>;
  clockOut: (data: { workerId: string }) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  bulkCreate: (records: any[]) => Promise<any>;
}

export function createAttendanceAPI(client: AxiosInstance): AttendanceAPI {
  return {
    list: (params) => client.get('/attendance', { params }),
    getToday: () => client.get('/attendance/today'),
    getSummary: (params) => client.get('/attendance/summary', { params }),
    create: (data) => client.post('/attendance', data),
    clockIn: (data) => client.post('/attendance/clock-in', data),
    clockOut: (data) => client.post('/attendance/clock-out', data),
    update: (id, data) => client.put(`/attendance/${id}`, data),
    bulkCreate: (records) => client.post('/attendance/bulk', { records }),
  };
}

export interface RosterAPI {
  listShifts: () => Promise<any>;
  createShift: (data: { name: string; startTime: string; endTime: string; color?: string; daysOfWeek?: string[] }) => Promise<any>;
  updateShift: (id: string, data: any) => Promise<any>;
  deleteShift: (id: string) => Promise<any>;
  listAssignments: (params?: { startDate?: string; endDate?: string; userId?: string }) => Promise<any>;
  createAssignment: (data: { shiftId: string; userId: string; date: string; notes?: string }) => Promise<any>;
  updateAssignment: (id: string, data: { shiftId?: string; date?: string; notes?: string }) => Promise<any>;
  bulkAssign: (assignments: Array<{ shiftId: string; userId: string; date: string; notes?: string }>) => Promise<any>;
  deleteAssignment: (id: string) => Promise<any>;
}

export function createRosterAPI(client: AxiosInstance): RosterAPI {
  return {
    listShifts: () => client.get('/shifts'),
    createShift: (data) => client.post('/shifts', data),
    updateShift: (id, data) => client.put(`/shifts/${id}`, data),
    deleteShift: (id) => client.delete(`/shifts/${id}`),
    listAssignments: (params) => client.get('/shift-assignments', { params }),
    createAssignment: (data) => client.post('/shift-assignments', data),
    updateAssignment: (id, data) => client.put(`/shift-assignments/${id}`, data),
    bulkAssign: (assignments) => client.post('/shift-assignments/bulk', { assignments }),
    deleteAssignment: (id) => client.delete(`/shift-assignments/${id}`),
  };
}

export interface MessagesAPI {
  inbox: () => Promise<any>;
  sent: () => Promise<any>;
  unreadCount: () => Promise<any>;
  /** People in the caller's organization they can message (no users.read needed). */
  recipients: () => Promise<any>;
  get: (id: string) => Promise<any>;
  send: (data: { subject: string; body: string; recipientIds: string[]; priority?: string }) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createMessagesAPI(client: AxiosInstance): MessagesAPI {
  return {
    inbox: () => client.get('/messages/inbox'),
    sent: () => client.get('/messages/sent'),
    unreadCount: () => client.get('/messages/unread-count'),
    recipients: () => client.get('/messages/recipients'),
    get: (id) => client.get(`/messages/${id}`),
    send: (data) => client.post('/messages', data),
    delete: (id) => client.delete(`/messages/${id}`),
  };
}

export interface CorrespondenceAPI {
  list: (params?: { status?: string; type?: string; category?: string; archived?: string }) => Promise<any>;
  get: (id: string) => Promise<any>;
  stats: () => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  archive: (id: string) => Promise<any>;
  unarchive: (id: string) => Promise<any>;
  delete: (id: string) => Promise<any>;
  addAttachment: (id: string, data: { fileName: string; fileSize: number; fileUrl: string; fileType?: string }) => Promise<any>;
  removeAttachment: (attachmentId: string) => Promise<any>;
}

export function createCorrespondenceAPI(client: AxiosInstance): CorrespondenceAPI {
  return {
    list: (params) => client.get('/correspondence', { params }),
    get: (id) => client.get(`/correspondence/${id}`),
    stats: () => client.get('/correspondence/stats'),
    create: (data) => client.post('/correspondence', data),
    update: (id, data) => client.put(`/correspondence/${id}`, data),
    archive: (id) => client.put(`/correspondence/${id}/archive`),
    unarchive: (id) => client.put(`/correspondence/${id}/unarchive`),
    delete: (id) => client.delete(`/correspondence/${id}`),
    addAttachment: (id, data) => client.post(`/correspondence/${id}/attachments`, data),
    removeAttachment: (attachmentId) => client.delete(`/correspondence/attachments/${attachmentId}`),
  };
}

export interface LeaveAPI {
  types: () => Promise<any>;
  createType: (data: any) => Promise<any>;
  updateType: (id: string, data: any) => Promise<any>;
  deleteType: (id: string) => Promise<any>;
  requests: (params?: any) => Promise<any>;
  balance: (params?: any) => Promise<any>;
  /** Org-wide ledger: every user's balance for a year (managers only). */
  allBalances: (params?: { year?: number }) => Promise<any>;
  createRequest: (data: any) => Promise<any>;
  updateRequest: (id: string, data: any) => Promise<any>;
  approve: (id: string) => Promise<any>;
  reject: (id: string, data?: any) => Promise<any>;
  cancel: (id: string) => Promise<any>;
  /** Approve/reject many at once → { succeeded, failed }. */
  bulkDecide: (data: { ids: string[]; action: 'approve' | 'reject'; rejectionReason?: string }) => Promise<any>;
}

export function createLeaveAPI(client: AxiosInstance): LeaveAPI {
  return {
    types: () => client.get('/leave/types'),
    createType: (data) => client.post('/leave/types', data),
    updateType: (id, data) => client.put(`/leave/types/${id}`, data),
    deleteType: (id) => client.delete(`/leave/types/${id}`),
    requests: (params) => client.get('/leave/requests', { params }),
    balance: (params) => client.get('/leave/balance', { params }),
    allBalances: (params) => client.get('/leave/balance/all', { params }),
    createRequest: (data) => client.post('/leave/requests', data),
    updateRequest: (id, data) => client.put(`/leave/requests/${id}`, data),
    approve: (id) => client.put(`/leave/requests/${id}/approve`),
    reject: (id, data) => client.put(`/leave/requests/${id}/reject`, data),
    cancel: (id) => client.put(`/leave/requests/${id}/cancel`),
    bulkDecide: (data) => client.put('/leave/requests/bulk', data),
  };
}
