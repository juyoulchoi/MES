// 간단한 fetch 래퍼: 쿠키 세션 or JWT 지원
export type HttpOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: boolean;
  authToken?: string; // JWT 모드
  withCredentials?: boolean; // 세션 쿠키 모드
  csrfToken?: string;
};

const defaultHeaders = { 'Content-Type': 'application/json' };

export async function http<T>(url: string, opt: HttpOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(opt.headers || {}),
  };
  if (opt.authToken) headers.Authorization = `Bearer ${opt.authToken}`;
  if (opt.csrfToken) headers['X-CSRF-Token'] = opt.csrfToken;

  const res = await fetch(url, {
    method: opt.method || 'GET',
    headers,
    credentials: opt.withCredentials ? 'include' : 'same-origin',
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type');
  return ct?.includes('application/json')
    ? await res.json()
    : ((await res.text()) as boolean);
}
