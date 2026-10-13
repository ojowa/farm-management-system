import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface APIClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

/**
 * The gateway always responds with `{ success, data, timestamp, requestId }`.
 * Call sites across admin/console/mobile expect the payload directly, so unwrap
 * it here — for success responses only, and only for JSON bodies (blob/texture
 * downloads must be left untouched).
 */
function unwrapEnvelope<T extends { data: any }>(response: T): T {
  const body = response.data;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return response;
  if (body.success !== true || !('data' in body) || typeof body.timestamp !== 'string') {
    return response;
  }
  response.data = body.data;
  return response;
}

/**
 * Normalise the two error shapes the gateway produces (proxied downstream
 * errors as `{ success:false, data }` and gateway errors as
 * `{ success:false, error }`) into a single `{ statusCode, message }` payload
 * so `err.response.data.message` works everywhere.
 */
function normalizeError(error: any) {
  const body = error?.response?.data;
  if (body && typeof body === 'object' && body.success === false) {
    const payload = body.data ?? body.error;
    if (payload && typeof payload === 'object') {
      const normalized = { ...payload };
      if (normalized.message === undefined && typeof body.error?.message === 'string') {
        normalized.message = body.error.message;
      }
      if (normalized.statusCode === undefined && body.error?.statusCode !== undefined) {
        normalized.statusCode = body.error.statusCode;
      }
      error.response.data = normalized;
    }
  }
  return Promise.reject(error);
}

export function createAPIClient(config: APIClientConfig = {}): AxiosInstance {
  const baseURL = config.baseURL!;
  const client = axios.create({
    baseURL,
    timeout: config.timeout || 15000,
    headers: config.headers || { 'Content-Type': 'application/json' },
    withCredentials: config.withCredentials ?? true,
  });

  client.interceptors.response.use((response) => {
    const responseType = response.config?.responseType || 'json';
    if (responseType !== 'json' && responseType !== 'text') return response;
    return unwrapEnvelope(response);
  }, normalizeError);

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
