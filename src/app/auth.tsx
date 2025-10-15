import { CONFIG } from '@/app/config';

type LoginArgs = { userId: string; password: string };

export function getCsrfToken(): string | null {
  // 1) meta 태그 → <meta name="csrf-token" content="...">
  const meta = document.querySelector(
    'meta[name="csrf-token"]'
  ) as HTMLMetaElement | null;
  if (meta?.content) return meta.content;
  // 2) 쿠키(XSRF-TOKEN) 사용 시
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function resolveRedirect(from?: string): string {
  // from이 /app로 시작하면 그대로, 아니면 CONFIG.defaultRedirect
  if (from && from.startsWith('/app')) return from;
  return CONFIG.defaultRedirect;
}

export async function login({
  userId,
  password,
}: LoginArgs): Promise<
  { ok: true; token?: string } | { ok: false; error?: string }
> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    };
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;

    // const res = await fetch(CONFIG.loginApi, {
    //   method: 'POST',
    //   headers,
    //   body: JSON.stringify({ userId, password }),
    //   credentials: 'include', // 세션 모드 시 필요
    //   cache: 'no-store',
    // });

    // if (!res.ok) {
    //   const msg = await res.text().catch(() => '');
    //   return { ok: false, error: msg || `HTTP ${res.status}` };
    // }

    if (CONFIG.authMode === 'token') {
      const data = (await res.json().catch(() => ({}))) as { token?: string };
      if (!data.token) return { ok: false, error: '토큰이 응답에 없습니다.' };
      localStorage.setItem('token', data.token);
      return { ok: true, token: data.token };
    }

    // session 모드: 쿠키로 인증됨
    localStorage.setItem('token', 'session_ok'); // PrivateRoute 호환용 마커
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
