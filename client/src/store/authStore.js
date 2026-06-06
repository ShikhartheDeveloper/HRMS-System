import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  tenant: (() => {
    try {
      const savedTenant = localStorage.getItem('hrms_tenant');
      return savedTenant ? JSON.parse(savedTenant) : null;
    } catch (e) {
      return null;
    }
  })(), // Holds { id, name, subdomain }
  profileImageUrl: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, token) => set({
    user,
    token,
    isAuthenticated: true,
    isInitialized: true
  }),

  setTenant: (tenant) => {
    if (tenant) {
      localStorage.setItem('hrms_subdomain', tenant.subdomain);
      localStorage.setItem('hrms_tenant', JSON.stringify(tenant));
    } else {
      localStorage.removeItem('hrms_subdomain');
      localStorage.removeItem('hrms_tenant');
    }
    set({ tenant });
  },

  setProfileImageUrl: (profileImageUrl) => set({ profileImageUrl }),

  clearAuth: () => {
    set({
      user: null,
      token: null,
      profileImageUrl: null,
      isAuthenticated: false,
      isInitialized: true
    });
  },

  setInitialized: (val) => set({ isInitialized: val })
}));

export default useAuthStore;
