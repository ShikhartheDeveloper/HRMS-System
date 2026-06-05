import { create } from 'zustand';

const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.read).length;
    set({ notifications, unreadCount });
  },
  
  markAsRead: (id) => set((state) => {
    const updated = state.notifications.map(n => n._id === id ? { ...n, read: true } : n);
    return {
      notifications: updated,
      unreadCount: updated.filter(n => !n.read).length
    };
  }),

  setLoading: (loading) => set({ loading })
}));

export default useNotificationStore;
