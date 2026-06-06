import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isInitialized, setAuth, clearAuth, setInitialized, profileImageUrl, setProfileImageUrl, setTenant } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      if (!isAuthenticated && !isInitialized) {
        try {
          const res = await api.post('/auth/refresh');
          if (res.data.success) {
            const { user, token, tenant } = res.data.data;
            if (tenant) {
              setTenant(tenant);
            }
            setAuth(user, token);
            // Fetch profile image if employee ID exists
            if (user?.employee?._id) {
              try {
                const imgRes = await api.get(`/uploads/profile-image/${user.employee._id}`);
                if (imgRes.data.success && imgRes.data.data.signedUrl) {
                  setProfileImageUrl(imgRes.data.data.signedUrl);
                }
              } catch (e) {
                // Ignore failure to load profile image
              }
            }
          } else {
            clearAuth();
          }
        } catch (err) {
          clearAuth();
        }
      } else if (isAuthenticated && !profileImageUrl && useAuthStore.getState().user?.employee?._id) {
        // Fetch image if authenticated but image not loaded
        try {
          const empId = useAuthStore.getState().user.employee._id;
          api.get(`/uploads/profile-image/${empId}`).then((imgRes) => {
            if (imgRes.data.success && imgRes.data.data.signedUrl) {
              setProfileImageUrl(imgRes.data.data.signedUrl);
            }
          }).catch(() => {});
        } catch (e) {}
      }
    };
    checkSession();
  }, [isAuthenticated, isInitialized, setAuth, clearAuth, profileImageUrl, setProfileImageUrl]);

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

  return children ?? <Outlet />;
};

export default PrivateRoute;
