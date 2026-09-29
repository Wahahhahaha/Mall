import React from 'react';
import { Navigate } from 'react-router-dom';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const PublicOnlyRoute = ({ children, redirectTo = '/' }: PublicOnlyRouteProps) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
};

export default PublicOnlyRoute;
