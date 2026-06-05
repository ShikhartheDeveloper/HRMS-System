import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isInitialized, setAuth, clearAuth, setInitialized } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      if (!isAuthenticated && !isInitialized) {
        try {
          const res = await api.post('/auth/refresh');
          if (res.data.success) {
            const { user, token } = res.data.data;
            setAuth(user, token);
          } else {
            clearAuth();
          }
        } catch (err) {
          clearAuth();
        }
      }
    };
    checkSession();
  }, [isAuthenticated, isInitialized, setAuth, clearAuth]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-sm font-medium text-textSecondary">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
