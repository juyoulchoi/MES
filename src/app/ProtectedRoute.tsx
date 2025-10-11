import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/auth';

export function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { user, hasRole } = useAuth();
  const loc = useLocation();

  if (!user)
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`}
        replace
      />
    );
  if (roles?.length && !roles.some(hasRole))
    return <Navigate to="/403" replace />;

  return <Outlet />;
}
