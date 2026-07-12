import { AxiosInstance } from 'axios';

export interface PoultryAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  listPens: (params?: any) => Promise<any>;
  listBreeds: (params?: any) => Promise<any>;
}

export function createPoultryAPI(client: AxiosInstance): PoultryAPI {
  return {
    list: (params) => client.get('/poultry/flocks', { params }),
    get: (id) => client.get(`/poultry/flocks/${id}`),
    create: (data) => client.post('/poultry/flocks', data),
    update: (id, data) => client.put(`/poultry/flocks/${id}`, data),
    delete: (id) => client.delete(`/poultry/flocks/${id}`),
    listPens: (params) => client.get('/poultry/pens', { params }),
    listBreeds: (params) => client.get('/poultry/breeds', { params }),
  };
}

export interface PoultryHousesAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createPoultryHousesAPI(client: AxiosInstance): PoultryHousesAPI {
  return {
    list: (params) => client.get('/poultry/poultry-houses', { params }),
    get: (id) => client.get(`/poultry/poultry-houses/${id}`),
    create: (data) => client.post('/poultry/poultry-houses', data),
    update: (id, data) => client.put(`/poultry/poultry-houses/${id}`, data),
    delete: (id) => client.delete(`/poultry/poultry-houses/${id}`),
  };
}

export interface FeedingRecordsAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createFeedingRecordsAPI(client: AxiosInstance): FeedingRecordsAPI {
  return {
    list: (params) => client.get('/poultry/feeding-records', { params }),
    get: (id) => client.get(`/poultry/feeding-records/${id}`),
    create: (data) => client.post('/poultry/feeding-records', data),
    update: (id, data) => client.put(`/poultry/feeding-records/${id}`, data),
    delete: (id) => client.delete(`/poultry/feeding-records/${id}`),
  };
}

export interface VaccinationRecordsAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createVaccinationRecordsAPI(client: AxiosInstance): VaccinationRecordsAPI {
  return {
    list: (params) => client.get('/poultry/vaccination-records', { params }),
    get: (id) => client.get(`/poultry/vaccination-records/${id}`),
    create: (data) => client.post('/poultry/vaccination-records', data),
    update: (id, data) => client.put(`/poultry/vaccination-records/${id}`, data),
    delete: (id) => client.delete(`/poultry/vaccination-records/${id}`),
  };
}

export interface MortalityRecordsAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createMortalityRecordsAPI(client: AxiosInstance): MortalityRecordsAPI {
  return {
    list: (params) => client.get('/poultry/mortality-records', { params }),
    get: (id) => client.get(`/poultry/mortality-records/${id}`),
    create: (data) => client.post('/poultry/mortality-records', data),
    update: (id, data) => client.put(`/poultry/mortality-records/${id}`, data),
    delete: (id) => client.delete(`/poultry/mortality-records/${id}`),
  };
}

export interface EggProductionAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createEggProductionAPI(client: AxiosInstance): EggProductionAPI {
  return {
    list: (params) => client.get('/poultry/egg-production', { params }),
    get: (id) => client.get(`/poultry/egg-production/${id}`),
    create: (data) => client.post('/poultry/egg-production', data),
    update: (id, data) => client.put(`/poultry/egg-production/${id}`, data),
    delete: (id) => client.delete(`/poultry/egg-production/${id}`),
  };
}

export interface MedicationAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createMedicationAPI(client: AxiosInstance): MedicationAPI {
  return {
    list: (params) => client.get('/poultry/medications', { params }),
    get: (id) => client.get(`/poultry/medications/${id}`),
    create: (data) => client.post('/poultry/medications', data),
    update: (id, data) => client.put(`/poultry/medications/${id}`, data),
    delete: (id) => client.delete(`/poultry/medications/${id}`),
  };
}

export interface PoultrySalesAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createPoultrySalesAPI(client: AxiosInstance): PoultrySalesAPI {
  return {
    list: (params) => client.get('/poultry/sales', { params }),
    get: (id) => client.get(`/poultry/sales/${id}`),
    create: (data) => client.post('/poultry/sales', data),
    update: (id, data) => client.put(`/poultry/sales/${id}`, data),
    delete: (id) => client.delete(`/poultry/sales/${id}`),
  };
}
