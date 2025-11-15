import { useCallback, useMemo, useState } from 'react';
import { http } from '@/lib/http';

export function buildQuery(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    q.set(k, String(v));
  });
  return q.toString();
}

export function useListQuery<T>(endpoint: string, initialParams: Record<string, any> = {}) {
  const [params, setParams] = useState<Record<string, any>>(initialParams);
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = useMemo(() => `${endpoint}?${buildQuery(params)}`, [endpoint, params]);

  const refetch = useCallback(async (next?: Record<string, any>) => {
    if (next) setParams(next);
    setLoading(true);
    setError(null);
    try {
      const res = await http<T[]>(next ? `${endpoint}?${buildQuery(next)}` : url);
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [endpoint, url]);

  return { data, loading, error, params, setParams, refetch };
}
