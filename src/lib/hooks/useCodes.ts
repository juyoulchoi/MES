import { useEffect, useRef, useState } from 'react';

import { fetchCommonCodes } from '@/services/common/commonCode';

export type Code = { code: string; name: string };

const codeCache = new Map<string, Code[]>();
const pendingCodeRequests = new Map<string, Promise<Code[]>>();

function getCacheKey(group: string) {
  return group.trim();
}

function fetchCodesOnce(group: string) {
  const cacheKey = getCacheKey(group);
  const cached = codeCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = pendingCodeRequests.get(cacheKey);
  if (pending) return pending;

  const request = fetchCommonCodes({
    apiPath: '/api/v1/mdm/code/comcode',
    groupCode: group,
  })
    .then((list) => {
      codeCache.set(cacheKey, list);
      return list;
    })
    .finally(() => {
      pendingCodeRequests.delete(cacheKey);
    });

  pendingCodeRequests.set(cacheKey, request);
  return request;
}

export function useCodes(group: string, fallback: Code[] = []) {
  const [codes, setCodes] = useState<Code[]>(fallback);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  useEffect(() => {
    let mounted = true;
    const cacheKey = getCacheKey(group);
    const cached = codeCache.get(cacheKey);

    if (cached) {
      setCodes(cached);
      setLoading(false);
      setError(null);
      return () => {
        mounted = false;
      };
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchCodesOnce(group);
        if (mounted) setCodes(list);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
        if (mounted && fallbackRef.current.length) setCodes(fallbackRef.current);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [group]);

  return { codes, loading, error };
}
