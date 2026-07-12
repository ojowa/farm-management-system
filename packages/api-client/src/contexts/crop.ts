import { AxiosInstance } from 'axios';

export interface CropsAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createCropsAPI(client: AxiosInstance): CropsAPI {
  return {
    list: (params) => client.get('/crops', { params }),
    get: (id) => client.get(`/crops/${id}`),
    create: (data) => client.post('/crops', data),
    update: (id, data) => client.put(`/crops/${id}`, data),
    delete: (id) => client.delete(`/crops/${id}`),
  };
}

export interface CropStagesAPI {
  calendar: (params?: any) => Promise<any>;
  listByCycle: (cropCycleId: string) => Promise<any>;
  create: (cropCycleId: string, data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createCropStagesAPI(client: AxiosInstance): CropStagesAPI {
  return {
    calendar: (params) => client.get('/crops/lifecycle/calendar', { params }),
    listByCycle: (cropCycleId) => client.get(`/crops/lifecycle/crop-cycle/${cropCycleId}/stages`),
    create: (cropCycleId, data) => client.post(`/crops/lifecycle/crop-cycle/${cropCycleId}/stages`, data),
    update: (id, data) => client.put(`/crops/lifecycle/stages/${id}`, data),
    delete: (id) => client.delete(`/crops/lifecycle/stages/${id}`),
  };
}

export interface YieldAPI {
  listByCrop: (cropId: string) => Promise<any>;
  create: (cropId: string, data: any) => Promise<any>;
  summary: (cropId: string) => Promise<any>;
}

export function createYieldAPI(client: AxiosInstance): YieldAPI {
  return {
    listByCrop: (cropId) => client.get(`/crops/yield/crop/${cropId}`),
    create: (cropId, data) => client.post(`/crops/yield/crop/${cropId}`, data),
    summary: (cropId) => client.get(`/crops/yield/crop/${cropId}/summary`),
  };
}

export interface IrrigationAPI {
  listSchedules: (params?: any) => Promise<any>;
  createSchedule: (data: any) => Promise<any>;
  updateSchedule: (id: string, data: any) => Promise<any>;
  deleteSchedule: (id: string) => Promise<any>;
  createLog: (data: any) => Promise<any>;
  listLogs: (params?: any) => Promise<any>;
}

export function createIrrigationAPI(client: AxiosInstance): IrrigationAPI {
  return {
    listSchedules: (params) => client.get('/crops/irrigation/schedule', { params }),
    createSchedule: (data) => client.post('/crops/irrigation/schedule', data),
    updateSchedule: (id, data) => client.put(`/crops/irrigation/schedule/${id}`, data),
    deleteSchedule: (id) => client.delete(`/crops/irrigation/schedule/${id}`),
    createLog: (data) => client.post('/crops/irrigation/log', data),
    listLogs: (params) => client.get('/crops/irrigation/log', { params }),
  };
}

export interface PestDiseaseAPI {
  list: (params?: any) => Promise<any>;
  active: () => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createPestDiseaseAPI(client: AxiosInstance): PestDiseaseAPI {
  return {
    list: (params) => client.get('/crops/pest-disease', { params }),
    active: () => client.get('/crops/pest-disease/active'),
    create: (data) => client.post('/crops/pest-disease', data),
    update: (id, data) => client.put(`/crops/pest-disease/${id}`, data),
    delete: (id) => client.delete(`/crops/pest-disease/${id}`),
  };
}
