import { http } from '@/lib/http';
import { useEffect, useRef, useState } from 'react';

export type Code = { code: string; name: string };

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
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await http<Code[]>(`/api/codes?group=${encodeURIComponent(group)}`);
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


