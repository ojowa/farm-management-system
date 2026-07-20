'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchOptions {
  cacheTime?: number;
  enabled?: boolean;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const cache = new Map<string, { data: any; timestamp: number }>();

export function useFetch<T>(key: string, fetcher: () => Promise<{ data: T }>, options: UseFetchOptions = {}): UseFetchResult<T> {
  const { cacheTime = 60_000, enabled = true } = options;
  const [data, setData] = useState<T | null>(() => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(!data && enabled);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current();
      if (!mountedRef.current) return;
      const d = res.data as any;
      setData(d);
      cache.set(key, { data: d, timestamp: Date.now() });
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError(err.response?.data?.message || err.message || 'Failed to fetch');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [key, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data);
      setLoading(false);
    } else if (enabled) {
      fetchData();
    }
    return () => { mountedRef.current = false; };
  }, [key, enabled]);

  return { data, loading, error, refetch: fetchData };
}

export function clearFetchCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key);
  }
}
