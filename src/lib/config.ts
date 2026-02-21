export const CONFIG = {
  authMode: 'session' as 'session' | 'token', // 토큰 모드면 "token"
  loginApi: '/api/v1/auth/login', // 로그인 API 엔드포인트
  defaultRedirect: '/app/Default', // ✅ 라우트 경로로 지정 (파일 경로 금지)
};
