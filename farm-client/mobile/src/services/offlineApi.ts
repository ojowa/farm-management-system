import { store } from '../store/store';
import { enqueueOperation } from '../store/slices/syncSlice';
import {
  farmsAPI,
  cropsAPI,
  livestockAPI,
  poultryAPI,
  financeAPI,
  tasksAPI,
  attendanceAPI,
} from './api';

type ModuleKey = 'farms' | 'crops' | 'livestocks' | 'poultry' | 'finance' | 'tasks' | 'attendance';

function isOnline(): boolean {
  return store.getState().sync.isOnline;
}

function queueWrite(
  module: ModuleKey,
  method: 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any
) {
  store.dispatch(enqueueOperation({ method, endpoint, data, module }));
}

function extractIdFromEndpoint(endpoint: string): string | null {
  const parts = endpoint.split('/');
  return parts[parts.length - 1] || null;
}

export const offlineFarmsAPI = {
  list: (params?: any) => farmsAPI.list(params),
  get: (id: string) => farmsAPI.get(id),
  create: (data: any) => {
    if (!isOnline()) {
      queueWrite('farms', 'POST', '/farms', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return farmsAPI.create(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      queueWrite('farms', 'PUT', `/farms/${id}`, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return farmsAPI.update(id, data);
  },
  delete: (id: string) => {
    if (!isOnline()) {
      queueWrite('farms', 'DELETE', `/farms/${id}`);
      return Promise.resolve({ data: { success: true } } as any);
    }
    return farmsAPI.delete(id);
  },
};

export const offlineCropsAPI = {
  list: (params?: any) => cropsAPI.list(params),
  get: (id: string) => cropsAPI.get(id),
  listCycles: (params?: any) => cropsAPI.listCycles(params),
  create: (data: any) => {
    if (!isOnline()) {
      queueWrite('crops', 'POST', '/crops', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return cropsAPI.create(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      queueWrite('crops', 'PUT', `/crops/${id}`, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return cropsAPI.update(id, data);
  },
  delete: (id: string) => {
    if (!isOnline()) {
      queueWrite('crops', 'DELETE', `/crops/${id}`);
      return Promise.resolve({ data: { success: true } } as any);
    }
    return cropsAPI.delete(id);
  },
};

export const offlineLivestockAPI = {
  list: (params?: any) => livestockAPI.list(params),
  get: (id: string) => livestockAPI.get(id),
  create: (data: any) => {
    if (!isOnline()) {
      queueWrite('livestocks', 'POST', '/livestock', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return livestockAPI.create(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      queueWrite('livestocks', 'PUT', `/livestock/${id}`, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return livestockAPI.update(id, data);
  },
  delete: (id: string) => {
    if (!isOnline()) {
      queueWrite('livestocks', 'DELETE', `/livestock/${id}`);
      return Promise.resolve({ data: { success: true } } as any);
    }
    return livestockAPI.delete(id);
  },
};

export const offlinePoultryAPI = {
  list: (params?: any) => poultryAPI.list(params),
  get: (id: string) => poultryAPI.get(id),
  listPens: (params?: any) => poultryAPI.listPens(params),
  listBreeds: (params?: any) => poultryAPI.listBreeds(params),
  create: (data: any) => {
    if (!isOnline()) {
      queueWrite('poultry', 'POST', '/flocks', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return poultryAPI.create(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      queueWrite('poultry', 'PUT', `/flocks/${id}`, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return poultryAPI.update(id, data);
  },
  delete: (id: string) => {
    if (!isOnline()) {
      queueWrite('poultry', 'DELETE', `/flocks/${id}`);
      return Promise.resolve({ data: { success: true } } as any);
    }
    return poultryAPI.delete(id);
  },
};

export const offlineFinanceAPI = {
  list: (params?: any) => financeAPI.list(params),
  get: (id: string) => financeAPI.get(id),
  create: (data: any) => {
    if (!isOnline()) {
      const endpoint = data.type === 'income' ? '/sales' : '/expenses';
      queueWrite('finance', 'POST', endpoint, data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return financeAPI.create(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      const endpoint = data.type === 'income' ? `/sales/${id}` : `/expenses/${id}`;
      queueWrite('finance', 'PUT', endpoint, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return financeAPI.update(id, data);
  },
  delete: (id: string) => {
    if (!isOnline()) {
      queueWrite('finance', 'DELETE', `/expenses/${id}`);
      return Promise.resolve({ data: { success: true } } as any);
    }
    return financeAPI.delete(id);
  },
};

export const offlineTasksAPI = {
  list: (params?: any) => tasksAPI.list(params),
  get: (id: string) => tasksAPI.get(id),
  create: (data: any) => {
    if (!isOnline()) {
      queueWrite('tasks', 'POST', '/tasks', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return tasksAPI.create(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      queueWrite('tasks', 'PUT', `/tasks/${id}`, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return tasksAPI.update(id, data);
  },
  updateStatus: (id: string, status: string) => {
    if (!isOnline()) {
      queueWrite('tasks', 'PUT', `/tasks/${id}/status`, { status });
      return Promise.resolve({ data: { id, status } } as any);
    }
    return tasksAPI.updateStatus(id, status);
  },
  delete: (id: string) => {
    if (!isOnline()) {
      queueWrite('tasks', 'DELETE', `/tasks/${id}`);
      return Promise.resolve({ data: { success: true } } as any);
    }
    return tasksAPI.delete(id);
  },
};

export const offlineAttendanceAPI = {
  list: (params?: any) => attendanceAPI.list(params),
  getToday: () => attendanceAPI.getToday(),
  getSummary: (params: { workerId: string; month?: number; year?: number }) =>
    attendanceAPI.getSummary(params),
  create: (data: any) => {
    if (!isOnline()) {
      queueWrite('attendance', 'POST', '/attendance', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return attendanceAPI.create(data);
  },
  clockIn: (data: { workerId: string; workerName: string }) => {
    if (!isOnline()) {
      queueWrite('attendance', 'POST', '/attendance/clock-in', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return attendanceAPI.clockIn(data);
  },
  clockOut: (data: { workerId: string }) => {
    if (!isOnline()) {
      queueWrite('attendance', 'POST', '/attendance/clock-out', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return attendanceAPI.clockOut(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      queueWrite('attendance', 'PUT', `/attendance/${id}`, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return attendanceAPI.update(id, data);
  },
  bulkCreate: (records: any[]) => {
    if (!isOnline()) {
      queueWrite('attendance', 'POST', '/attendance/bulk', { records });
      return Promise.resolve({ data: { success: true } } as any);
    }
    return attendanceAPI.bulkCreate(records);
  },
};
