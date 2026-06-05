import { create } from 'zustand';

const useAttendanceStore = create((set) => ({
  myRecords: [],
  teamRecords: [],
  currentRecord: null, // Today's punch log
  loading: false,
  error: null,

  setMyRecords: (myRecords) => set({ myRecords, error: null }),
  setTeamRecords: (teamRecords) => set({ teamRecords, error: null }),
  setCurrentRecord: (currentRecord) => set({ currentRecord, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false })
}));

export default useAttendanceStore;
