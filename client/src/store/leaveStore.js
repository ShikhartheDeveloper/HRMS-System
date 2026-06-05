import { create } from 'zustand';

const useLeaveStore = create((set) => ({
  balances: { quota: {}, used: {}, remaining: {} },
  history: [],
  pendingApprovals: [],
  teamCalendar: [],
  loading: false,
  error: null,

  setBalances: (balances) => set({ balances, error: null }),
  setHistory: (history) => set({ history, error: null }),
  setPendingApprovals: (pendingApprovals) => set({ pendingApprovals, error: null }),
  setTeamCalendar: (teamCalendar) => set({ teamCalendar, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false })
}));

export default useLeaveStore;
