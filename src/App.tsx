import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// 로그인 페이지는 캔버스의 Login 컴포넌트를 경로에 맞게 import
import LoginPage from '@login'; // ← 파일 위치에 맞게 조정
import LayoutSPA from '@/layouts/LayoutSPA'; // ← 파일 위치에 맞게 조정

/* -------- 인증 가드 -------- */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  const location = useLocation();
  return token ? (
    <>{children}</>
  ) : (
    // 로그인 후 다시 돌아올 곳을 state.from에 저장
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

// index → /login, 로그인 성공 → /app
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/app" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 로그인 페이지: 로그인 상태면 /app 으로 */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      {/* 보호 라우트: /app/* (LayoutSPA는 파일명 Default.tsx여도 상관없음) */}
      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            <LayoutSPA /> {/* 파일명이 Default.tsx여도 OK */}
          </PrivateRoute>
        }
      />

      {/* 그 외 → 로그인 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
