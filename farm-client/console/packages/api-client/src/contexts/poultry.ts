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
    list: (params) => client.get('/flocks', { params }),
    get: (id) => client.get(`/flocks/${id}`),
    create: (data) => client.post('/flocks', data),
    update: (id, data) => client.put(`/flocks/${id}`, data),
    delete: (id) => client.delete(`/flocks/${id}`),
    listPens: (params) => client.get('/pens', { params }),
    listBreeds: (params) => client.get('/breeds', { params }),
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
    list: (params) => client.get('/poultry-houses', { params }),
    get: (id) => client.get(`/poultry-houses/${id}`),
    create: (data) => client.post('/poultry-houses', data),
    update: (id, data) => client.put(`/poultry-houses/${id}`, data),
    delete: (id) => client.delete(`/poultry-houses/${id}`),
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
    list: (params) => client.get('/feeding-records', { params }),
    get: (id) => client.get(`/feeding-records/${id}`),
    create: (data) => client.post('/feeding-records', data),
    update: (id, data) => client.put(`/feeding-records/${id}`, data),
    delete: (id) => client.delete(`/feeding-records/${id}`),
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
    list: (params) => client.get('/vaccination-records', { params }),
    get: (id) => client.get(`/vaccination-records/${id}`),
    create: (data) => client.post('/vaccination-records', data),
    update: (id, data) => client.put(`/vaccination-records/${id}`, data),
    delete: (id) => client.delete(`/vaccination-records/${id}`),
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
    list: (params) => client.get('/mortality-records', { params }),
    get: (id) => client.get(`/mortality-records/${id}`),
    create: (data) => client.post('/mortality-records', data),
    update: (id, data) => client.put(`/mortality-records/${id}`, data),
    delete: (id) => client.delete(`/mortality-records/${id}`),
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
    list: (params) => client.get('/egg-production', { params }),
    get: (id) => client.get(`/egg-production/${id}`),
    create: (data) => client.post('/egg-production', data),
    update: (id, data) => client.put(`/egg-production/${id}`, data),
    delete: (id) => client.delete(`/egg-production/${id}`),
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
    list: (params) => client.get('/medications', { params }),
    get: (id) => client.get(`/medications/${id}`),
    create: (data) => client.post('/medications', data),
    update: (id, data) => client.put(`/medications/${id}`, data),
    delete: (id) => client.delete(`/medications/${id}`),
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
    list: (params) => client.get('/poultry-sales', { params }),
    get: (id) => client.get(`/poultry-sales/${id}`),
    create: (data) => client.post('/poultry-sales', data),
    update: (id, data) => client.put(`/poultry-sales/${id}`, data),
    delete: (id) => client.delete(`/poultry-sales/${id}`),
  };
}
