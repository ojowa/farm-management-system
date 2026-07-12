import { AxiosInstance } from 'axios';

export interface WeatherAPI {
  current: (lat: number, lon: number) => Promise<any>;
  forecast: (lat: number, lon: number, days?: number) => Promise<any>;
  alerts: (lat: number, lon: number) => Promise<any>;
}

export function createWeatherAPI(client: AxiosInstance): WeatherAPI {
  return {
    current: (lat, lon) => client.get('/weather/current', { params: { lat, lon } }),
    forecast: (lat, lon, days) => client.get('/weather/forecast', { params: { lat, lon, days } }),
    alerts: (lat, lon) => client.get('/weather/alerts', { params: { lat, lon } }),
  };
}

export interface DocumentsAPI {
  list: (params?: any) => Promise<any>;
  upload: (formData: FormData) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createDocumentsAPI(client: AxiosInstance): DocumentsAPI {
  return {
    list: (params) => client.get('/documents', { params }),
    upload: (formData) => client.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => client.delete(`/documents/${id}`),
  };
}
