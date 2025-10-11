import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/app/auth';

/**
 * Login 페이지 (React Router + Tailwind v4 + shadcn/ui)
 * - 세션/토큰 모드 모두 지원
 * - CSRF 토큰 자동 첨부(meta[name="csrf-token"] 또는 XSRF-TOKEN 쿠키)
 * - 로그인 성공 시 ?redirect= 또는 /dashboard 로 이동
 *
 * 필요한 선행 조건
 * - react-router-dom 설치 및 BrowserRouter 래핑
 * - shadcn/ui: input, label, button, card 생성
 * - '@/app/auth'의 AuthProvider/useAuth 구성
 */

// ===== 환경 설정 =====
const CONFIG = {
  authMode: 'session' as 'session' | 'token', // 토큰 모드이면 "token"
  loginApi: '/api/login',
  defaultRedirect: '/dashboard',
};

function getCookie(name: string) {
  const safe = name.replace(/([.$?*|{}()[\]/+^])/g, '\\$1');
  const m = document.cookie.match(new RegExp(`(?:^|; )${safe}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}
function getCsrfToken(): string | undefined {
  const meta = document.querySelector(
    'meta[name="csrf-token"]'
  ) as HTMLMetaElement | null;
  if (meta?.content) return meta.content;
  return getCookie('XSRF-TOKEN');
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => username.trim().length > 0 && password.length > 0 && !submitting,
    [username, password, submitting]
  );

  const resolveRedirect = () => {
    const p = new URLSearchParams(location.search).get('redirect');
    return p || CONFIG.defaultRedirect;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const csrf = getCsrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;

      const res = await fetch(CONFIG.loginApi, {
        method: 'POST',
        headers,
        credentials: CONFIG.authMode === 'session' ? 'include' : 'same-origin',
        body: JSON.stringify({ username: username.trim(), password }),
      });

      //   if (!res.ok) {
      //     const text = await res.text().catch(() => '');
      //     throw new Error(text || `로그인 실패 (${res.status})`);
      //   }

      const contentType = res.headers.get('content-type');
      const payload = contentType?.includes('application/json')
        ? await res.json()
        : {};

      if (CONFIG.authMode === 'token') {
        // 응답 스키마 예: { user, accessToken, refreshToken }
        auth.signIn(payload?.user ?? null, payload?.accessToken);
      } else {
        // 세션 모드: 서버 세션에 의해 인증됨
        auth.signIn(payload?.user ?? null);
      }

      navigate(resolveRedirect(), { replace: true });
    } catch (err: any) {
      setError(err?.message || '로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full mx-auto max-w-lg px-4">
          <Card className="shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">계정 로그인</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 오류 표시 */}
              <div aria-live="polite" className="mb-2 min-h-[1.25rem]">
                {error && (
                  <p role="alert" className="text-red-600 text-sm">
                    {error}
                  </p>
                )}
              </div>

              <form onSubmit={onSubmit} className="grid gap-4" noValidate>
                <div className="grid gap-1.5">
                  <Label htmlFor="username">아이디</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="아이디"
                    autoComplete="username"
                    maxLength={64}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="비밀번호"
                    autoComplete="current-password"
                    maxLength={128}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex items-center justify-center">
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="px-5 disabled:opacity-100"
                  >
                    {submitting ? '로그인 중...' : '로그인'}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="text-sm text-gray-500 justify-center">
              MES System
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
