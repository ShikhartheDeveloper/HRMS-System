import { create } from 'zustand';

const useEmployeeStore = create((set) => ({
  employees: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  selectedEmployee: null,
  loading: false,
  error: null,

  setEmployees: (employees, pagination) => set({ employees, pagination, error: null }),
  setSelectedEmployee: (selectedEmployee) => set({ selectedEmployee, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false })
}));

export default useEmployeeStore;
