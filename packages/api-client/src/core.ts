import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface APIClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export function createAPIClient(config: APIClientConfig = {}): AxiosInstance {
  const baseURL = config.baseURL || 'http://localhost:4000';
  const client = axios.create({
    baseURL,
    timeout: config.timeout || 15000,
    headers: config.headers || { 'Content-Type': 'application/json' },
    withCredentials: config.withCredentials ?? true,
  });

  return client;
}

export function setupTokenRefresh(
  client: AxiosInstance,
  getRefreshToken: () => string | null,
  setTokens: (accessToken: string, refreshToken: string) => void,
  clearTokens: () => void,
  onUnauthorized?: () => void,
) {
  let isRefreshing = false;
  let failedQueue: Array<{ resolve: (v?: unknown) => void; reject: (e?: unknown) => void }> = [];

  const processQueue = (error: unknown) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
    failedQueue = [];
  };

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => client(originalRequest))
            .catch((err) => Promise.reject(err));
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            const res = await axios.post(`${client.defaults.baseURL}/auth/refresh`, {
              refreshToken,
            });
            setTokens(res.data.accessToken, res.data.refreshToken);
            processQueue(null);
            return client(originalRequest);
          }
          throw new Error('No refresh token');
        } catch (e) {
          processQueue(e);
          clearTokens();
          onUnauthorized?.();
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }
      return Promise.reject(error);
    }
  );
}
