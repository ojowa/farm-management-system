import { AxiosInstance } from 'axios';

export interface LivestockAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createLivestockAPI(client: AxiosInstance): LivestockAPI {
  return {
    list: (params) => client.get('/livestock', { params }),
    get: (id) => client.get(`/livestock/${id}`),
    create: (data) => client.post('/livestock', data),
    update: (id, data) => client.put(`/livestock/${id}`, data),
    delete: (id) => client.delete(`/livestock/${id}`),
  };
}

export interface LivestockHealthAPI {
  listByAnimal: (livestockId: string) => Promise<any>;
  create: (livestockId: string, data: any) => Promise<any>;
  listVaccinations: (livestockId: string) => Promise<any>;
  scheduleVaccination: (livestockId: string, data: any) => Promise<any>;
  administerVaccination: (id: string) => Promise<any>;
  overdueVaccinations: () => Promise<any>;
}

export function createLivestockHealthAPI(client: AxiosInstance): LivestockHealthAPI {
  return {
    listByAnimal: (livestockId) => client.get(`/health/livestock/${livestockId}`),
    create: (livestockId, data) => client.post(`/health/livestock/${livestockId}`, data),
    listVaccinations: (livestockId) => client.get(`/health/vaccinations/${livestockId}`),
    scheduleVaccination: (livestockId, data) => client.post(`/health/vaccinations/${livestockId}`, data),
    administerVaccination: (id) => client.put(`/health/vaccinations/${id}/administer`),
    overdueVaccinations: () => client.get('/health/overdue'),
  };
}

export interface BreedingAPI {
  list: (params?: any) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  upcoming: () => Promise<any>;
}

export function createBreedingAPI(client: AxiosInstance): BreedingAPI {
  return {
    list: (params) => client.get('/breeding', { params }),
    create: (data) => client.post('/breeding', data),
    update: (id, data) => client.put(`/breeding/${id}`, data),
    upcoming: () => client.get('/breeding/upcoming'),
  };
}

export interface WeightAPI {
  listByAnimal: (livestockId: string) => Promise<any>;
  recordForAnimal: (livestockId: string, data: any) => Promise<any>;
  listByFlock: (flockId: string) => Promise<any>;
  recordForFlock: (flockId: string, data: any) => Promise<any>;
}

export function createWeightAPI(client: AxiosInstance): WeightAPI {
  return {
    listByAnimal: (livestockId) => client.get(`/weight/livestock/${livestockId}`),
    recordForAnimal: (livestockId, data) => client.post(`/weight/livestock/${livestockId}`, data),
    listByFlock: (flockId) => client.get(`/weight/flock/${flockId}`),
    recordForFlock: (flockId, data) => client.post(`/weight/flock/${flockId}`, data),
  };
}
