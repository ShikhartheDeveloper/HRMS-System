import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = allowedRoles.includes(user.role);

  if (!hasAccess) {
    console.warn(`Access denied for role: ${user.role} to this page. Redirecting to dashboard.`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RoleRoute;
