import { AxiosInstance } from 'axios';

export interface PondAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createPondAPI(client: AxiosInstance): PondAPI {
  return {
    list: (params) => client.get('/aquaculture/ponds', { params }),
    get: (id) => client.get(`/aquaculture/ponds/${id}`),
    create: (data) => client.post('/aquaculture/ponds', data),
    update: (id, data) => client.put(`/aquaculture/ponds/${id}`, data),
    delete: (id) => client.delete(`/aquaculture/ponds/${id}`),
  };
}

export interface PondStockingAPI {
  listByPond: (pondId: string) => Promise<any>;
  create: (pondId: string, data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createPondStockingAPI(client: AxiosInstance): PondStockingAPI {
  return {
    listByPond: (pondId) => client.get(`/aquaculture/ponds/${pondId}/stockings`),
    create: (pondId, data) => client.post(`/aquaculture/ponds/${pondId}/stockings`, data),
    update: (id, data) => client.put(`/aquaculture/stockings/${id}`, data),
    delete: (id) => client.delete(`/aquaculture/stockings/${id}`),
  };
}

export interface PondFeedingAPI {
  listByPond: (pondId: string) => Promise<any>;
  create: (pondId: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createPondFeedingAPI(client: AxiosInstance): PondFeedingAPI {
  return {
    listByPond: (pondId) => client.get(`/aquaculture/ponds/${pondId}/feedings`),
    create: (pondId, data) => client.post(`/aquaculture/ponds/${pondId}/feedings`, data),
    delete: (id) => client.delete(`/aquaculture/feedings/${id}`),
  };
}

export interface PondWaterQualityAPI {
  listByPond: (pondId: string) => Promise<any>;
  create: (pondId: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createPondWaterQualityAPI(client: AxiosInstance): PondWaterQualityAPI {
  return {
    listByPond: (pondId) => client.get(`/aquaculture/ponds/${pondId}/water-quality`),
    create: (pondId, data) => client.post(`/aquaculture/ponds/${pondId}/water-quality`, data),
    delete: (id) => client.delete(`/aquaculture/water-quality/${id}`),
  };
}

export interface PondHarvestAPI {
  listByPond: (pondId: string) => Promise<any>;
  create: (pondId: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createPondHarvestAPI(client: AxiosInstance): PondHarvestAPI {
  return {
    listByPond: (pondId) => client.get(`/aquaculture/ponds/${pondId}/harvests`),
    create: (pondId, data) => client.post(`/aquaculture/ponds/${pondId}/harvests`, data),
    delete: (id) => client.delete(`/aquaculture/harvests/${id}`),
  };
}

export interface AquacultureAPI {
  ponds: PondAPI;
  stockings: PondStockingAPI;
  feedings: PondFeedingAPI;
  waterQuality: PondWaterQualityAPI;
  harvests: PondHarvestAPI;
}

export function createAquacultureAPI(client: AxiosInstance): AquacultureAPI {
  return {
    ponds: createPondAPI(client),
    stockings: createPondStockingAPI(client),
    feedings: createPondFeedingAPI(client),
    waterQuality: createPondWaterQualityAPI(client),
    harvests: createPondHarvestAPI(client),
  };
}
