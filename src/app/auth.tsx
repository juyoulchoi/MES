import React, { createContext, useContext, useEffect, useState } from 'react';

type User = { id: string; name: string; roles: string[] } | null;
type Mode = 'session' | 'token';

type AuthCtx = {
  user: User;
  token?: string;
  mode: Mode;
  signIn: (u: User, token?: string) => void;
  signOut: () => void;
  hasRole: (r: string) => boolean;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({
  children,
  mode = 'session' as Mode,
}: {
  children: React.ReactNode;
  mode?: Mode;
}) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | undefined>();

  useEffect(() => {
    // 초기 복원(JWT 모드)
    if (mode === 'token') {
      const t = localStorage.getItem('accessToken') || undefined;
      if (t) setToken(t);
      // 필요 시 /me 호출로 사용자 정보 복원
    }
  }, [mode]);

  const signIn = (u: User, t?: string) => {
    setUser(u);
    if (mode === 'token' && t) {
      setToken(t);
      localStorage.setItem('accessToken', t);
    }
  };

  const signOut = () => {
    setUser(null);
    setToken(undefined);
    localStorage.removeItem('accessToken');
    // 세션 모드면 서버 로그아웃 호출 추천
  };

  const hasRole = (r: string) => !!user?.roles?.includes(r);

  return (
    <AuthContext.Provider
      value={{ user, token, mode, signIn, signOut, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}
