import React, { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import api from '../../services/api';
import { Bell, ChevronDown } from 'lucide-react';

const Topbar = ({ title }) => {
  const { user, profileImageUrl } = useAuthStore();
  const { notifications, unreadCount, setNotifications, markAsRead } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (res.data.success) {
          setNotifications(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [setNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return (
    <header className="h-16 border-b border-borderColor bg-surface flex items-center justify-between px-8 select-none z-10">
      {/* Title */}
      <h1 className="font-semibold text-lg text-textPrimary tracking-tight">
        {title || 'Dashboard'}
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-6">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-textSecondary hover:text-textPrimary rounded-full hover:bg-background transition-all duration-150 relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger"></span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-borderColor rounded-card shadow-custom z-20 animate-fade-in p-2">
              <div className="flex justify-between items-center px-3 py-2 border-b border-borderColor">
                <span className="text-[12px] font-semibold text-textPrimary uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] bg-background text-textSecondary px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} unread
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-textSecondary text-[13px]">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => handleMarkRead(notif._id)}
                      className={`px-3 py-2.5 rounded-md hover:bg-background cursor-pointer transition-all duration-150 flex flex-col gap-0.5 ${
                        !notif.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <span className="text-[12px] font-semibold text-textPrimary">{notif.title}</span>
                      <span className="text-[11px] text-textSecondary">{notif.content}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt="Avatar"
              className="h-9 w-9 rounded-full object-cover shadow-sm border border-borderColor"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold uppercase shadow-sm">
              {user?.employee
                ? `${user.employee.firstName[0] || ''}${user.employee.lastName[0] || ''}`.toUpperCase()
                : (user?.email ? user.email.substring(0, 2).toUpperCase() : 'EM')}
            </div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-[13px] font-semibold text-textPrimary leading-none">
              {user?.employee
                ? `${user.employee.firstName} ${user.employee.lastName}`
                : (user?.email ? user.email.split('@')[0] : 'User')}
            </span>
            <span className="text-[10px] text-textSecondary font-semibold uppercase leading-none mt-1">
              {user?.role || 'EMPLOYEE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
