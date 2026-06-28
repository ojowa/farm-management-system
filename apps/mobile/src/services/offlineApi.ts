import { store } from '../store/store';
import { enqueueOperation } from '../store/slices/syncSlice';
import {
  farmsAPI,
  cropsAPI,
  livestockAPI,
  poultryAPI,
  financeAPI,
} from '../services/api';

type ModuleKey = 'farms' | 'crops' | 'livestocks' | 'poultry' | 'finance';

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
      queueWrite('livestocks', 'POST', '/livestocks', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return livestockAPI.create(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      queueWrite('livestocks', 'PUT', `/livestocks/${id}`, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return livestockAPI.update(id, data);
  },
  delete: (id: string) => {
    if (!isOnline()) {
      queueWrite('livestocks', 'DELETE', `/livestocks/${id}`);
      return Promise.resolve({ data: { success: true } } as any);
    }
    return livestockAPI.delete(id);
  },
};

export const offlinePoultryAPI = {
  list: (params?: any) => poultryAPI.list(params),
  get: (id: string) => poultryAPI.get(id),
  create: (data: any) => {
    if (!isOnline()) {
      queueWrite('poultry', 'POST', '/poultry', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return poultryAPI.create(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      queueWrite('poultry', 'PUT', `/poultry/${id}`, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return poultryAPI.update(id, data);
  },
  delete: (id: string) => {
    if (!isOnline()) {
      queueWrite('poultry', 'DELETE', `/poultry/${id}`);
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
      queueWrite('finance', 'POST', '/finance', data);
      return Promise.resolve({ data: { ...data, id: `pending-${Date.now()}` } } as any);
    }
    return financeAPI.create(data);
  },
  update: (id: string, data: any) => {
    if (!isOnline()) {
      queueWrite('finance', 'PUT', `/finance/${id}`, data);
      return Promise.resolve({ data: { ...data, id } } as any);
    }
    return financeAPI.update(id, data);
  },
  delete: (id: string) => {
    if (!isOnline()) {
      queueWrite('finance', 'DELETE', `/finance/${id}`);
      return Promise.resolve({ data: { success: true } } as any);
    }
    return financeAPI.delete(id);
  },
};
