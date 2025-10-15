export const CONFIG = {
  authMode: 'session' as 'session' | 'token', // 토큰 모드면 "token"
  loginApi: '/api/login',
  defaultRedirect: '/app', // ✅ 라우트 경로로 지정 (파일 경로 금지)
};
