import { CONFIG, resolveApiUrl } from '@/lib/config';
import { handleInvalidToken, shouldRedirectForUnauthorized } from '@/lib/authSession';

// 간단한 fetch 래퍼: 쿠키 세션 or JWT 지원
export type HttpOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown; // JSON 직렬화 대상 또는 문자열
  authToken?: string; // JWT 모드
  withCredentials?: boolean; // 세션 쿠키 모드
  csrfToken?: string;
  unwrapEnvelope?: boolean;
};

const defaultHeaders = { 'Content-Type': 'application/json' };

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  code?: string;
  status?: number;
  data?: T;
};

export async function http<T>(url: string, opt: HttpOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(opt.headers || {}),
  };
  const resolvedToken =
    opt.authToken ??
    (CONFIG.authMode === 'token' ? (localStorage.getItem('token') ?? undefined) : undefined);
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;
  if (opt.csrfToken) headers['X-CSRF-Token'] = opt.csrfToken;

  const useCredentials =
    opt.withCredentials !== undefined ? opt.withCredentials : CONFIG.authMode === 'session';

  const res = await fetch(resolveApiUrl(url), {
    method: opt.method || 'GET',
    headers,
    credentials: useCredentials ? 'include' : 'same-origin',
    body: opt.body
      ? typeof opt.body === 'string'
        ? opt.body
        : JSON.stringify(opt.body)
      : undefined,
  });

  const ct = res.headers.get('content-type');
  const isJson = ct?.includes('application/json');
  const shouldUnwrapEnvelope = opt.unwrapEnvelope !== false;

  if (!res.ok) {
    if (res.status === 401 && shouldRedirectForUnauthorized()) {
      handleInvalidToken();
      return new Promise<T>(() => {});
    }

    if (isJson) {
      const payload = (await res.json().catch(() => null)) as ApiEnvelope<unknown> | null;
      const message = (payload && typeof payload.message === 'string' && payload.message) || '';
      const code = (payload && typeof payload.code === 'string' && payload.code) || '';
      const status =
        (payload && typeof payload.status === 'number' && payload.status) || res.status;
      throw new Error(`HTTP ${status}${code ? ` ${code}` : ''}${message ? `: ${message}` : ''}`);
    }
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!isJson) {
    return (await res.text()) as T;
  }

  const payload = (await res.json()) as ApiEnvelope<T> | T;
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success === false) {
      throw new Error(envelope.message || '요청 처리에 실패했습니다.');
    }
    if (shouldUnwrapEnvelope) {
      return envelope.data as T;
    }
  }

  return payload as T;
}
