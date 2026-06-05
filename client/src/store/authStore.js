import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  tenant: null, // Holds { id, name, subdomain }
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
    } else {
      localStorage.removeItem('hrms_subdomain');
    }
    set({ tenant });
  },

  clearAuth: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: true
    });
  },

  setInitialized: (val) => set({ isInitialized: val })
}));

export default useAuthStore;
