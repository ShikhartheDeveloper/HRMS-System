import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { PageTitleProvider, usePageTitle } from './PageTitleContext';

const ROUTE_TITLES = {
  '/dashboard': 'Dashboard',
  '/profile': 'My Profile',
  '/documents': 'Documents',
  '/employees': 'All Employees',
  '/org-chart': 'Organization Tree',
  '/attendance': 'Attendance Muster',
  '/leave': 'Leave Management',
  '/approvals': 'Approvals Queue',
  '/reports': 'Reports & Analytics',
  '/settings': 'Settings',
  '/payroll': 'Payroll & Compliance',
  '/performance': 'Performance Management',
  '/recruitment': 'Recruitment & ATS',
  '/onboarding': 'Onboarding & Policy Sign-offs',
  '/expenses': 'Expense Claims',
  '/training': 'Learning & Development',
  '/assets': 'Asset Management',
  '/tickets': 'Helpdesk & HR Tickets'
};

const AppLayoutContent = () => {
  const { title, setTitle } = usePageTitle();
  const location = useLocation();
  const mainRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setTitle(ROUTE_TITLES[location.pathname] || 'Dashboard');
    setSidebarOpen(false); // Close drawer when navigating
  }, [location.pathname, setTitle]);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar title={title} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppLayout = () => (
  <PageTitleProvider>
    <AppLayoutContent />
  </PageTitleProvider>
);

export default AppLayout;
