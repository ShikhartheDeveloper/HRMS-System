import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import {
  LayoutDashboard,
  CalendarDays,
  FileSpreadsheet,
  User,
  Users,
  GitFork,
  BookOpen,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  FolderOpen,
  Coins,
  Target,
  Briefcase,
  CheckSquare,
  CreditCard,
  Laptop,
  LifeBuoy,
  Sparkles,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, clearAuth, profileImageUrl, tenant } = useAuthStore();
  const location = useLocation();

  const handleLogout = () => {
    clearAuth();
  };

  const menuGroups = [
    {
      label: 'CORE',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] }
      ]
    },
    {
      label: 'PEOPLE',
      items: [
        { name: 'My Profile', path: '/profile', icon: User, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'All Employees', path: '/employees', icon: Users, roles: ['HR_ADMIN', 'LEADERSHIP', 'MANAGER'] },
        { name: 'Org Chart', path: '/org-chart', icon: GitFork, roles: ['HR_ADMIN', 'LEADERSHIP'] },
        { name: 'Documents', path: '/documents', icon: FolderOpen, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] }
      ]
    },
    {
      label: 'TIME & APPROVALS',
      items: [
        { name: 'My Attendance', path: '/attendance', icon: CalendarDays, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'My Leave', path: '/leave', icon: FileSpreadsheet, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'Approvals Queue', path: '/approvals', icon: ShieldCheck, roles: ['MANAGER', 'HR_ADMIN', 'LEADERSHIP'] }
      ]
    },
    {
      label: 'REPORTS & CONFIG',
      items: [
        { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['HR_ADMIN', 'LEADERSHIP'] },
        { name: 'AI Advisory', path: '/ai-advisory', icon: Sparkles, roles: ['HR_ADMIN', 'LEADERSHIP'] },
        { name: 'Settings', path: '/settings', icon: Settings, roles: ['HR_ADMIN'] }
      ]
    },
    {
      label: 'PREMIUM MODULES',
      items: [
        { name: 'Payroll & Compliance', path: '/payroll', icon: Coins, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'Performance', path: '/performance', icon: Target, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'Recruitment', path: '/recruitment', icon: Briefcase, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'Onboarding & Docs', path: '/onboarding', icon: CheckSquare, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'Expenses', path: '/expenses', icon: CreditCard, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'L&D Training', path: '/training', icon: BookOpen, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'Assets Tracker', path: '/assets', icon: Laptop, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] },
        { name: 'Helpdesk Tickets', path: '/tickets', icon: LifeBuoy, roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'] }
      ]
    }
  ];

  const filteredGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(user?.role))
    }))
    .filter(group => group.items.length > 0);

  return (
    <aside className={`w-60 shrink-0 bg-sidebar text-sidebarText h-screen flex flex-col justify-between select-none transition-all duration-300 fixed md:sticky top-0 left-0 z-30 ${
      isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}>
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* Logo and Tagline */}
        <div className="h-16 shrink-0 flex flex-col justify-center px-6 border-b border-gray-800 sticky top-0 z-10 bg-sidebar">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg text-white tracking-wide">HRMS Elite</span>
            <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-1 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">{tenant?.name || 'Organization'}</span>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 px-3 py-6 space-y-6">
          {filteredGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-2">
              <span className="px-3 text-[10px] font-semibold text-gray-500 tracking-wider uppercase">
                {group.label}
              </span>
              <ul className="space-y-1">
                {group.items.map((item, itemIdx) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <li key={itemIdx}>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-md transition-all duration-150 ${
                          isActive
                            ? 'text-white bg-white/5 border-l-[3px] border-primary pl-[9px]'
                            : 'hover:text-white hover:bg-white/5 pl-3'
                        }`}
                      >
                        <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-primary' : 'text-sidebarText'}`} />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="shrink-0 p-4 border-t border-gray-800 flex flex-col gap-3 bg-sidebar">
        <div className="flex items-center gap-3 px-2">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt="Avatar"
              className="h-8 w-8 rounded-full object-cover shadow-sm border border-gray-800"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold uppercase">
              {user?.employee
                ? `${user.employee.firstName[0] || ''}${user.employee.lastName[0] || ''}`.toUpperCase()
                : (user?.email ? user.email.substring(0, 2).toUpperCase() : 'HR')}
            </div>
          )}
          <div className="flex flex-col overflow-hidden text-left">
            <span className="text-[12px] font-medium text-white truncate">
              {user?.employee
                ? `${user.employee.firstName} ${user.employee.lastName}`
                : (user?.email ? user.email.split('@')[0] : 'User')}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold uppercase">{user?.role || 'EMPLOYEE'}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full text-left"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
