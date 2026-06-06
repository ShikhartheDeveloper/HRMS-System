import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';
import AppLayout from '../components/layout/AppLayout';

// Page Imports
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import EmployeeList from '../pages/employees/EmployeeList';
import OrgChart from '../pages/employees/OrgChart';
import AttendanceRecords from '../pages/attendance/AttendanceRecords';
import LeaveManager from '../pages/leave/LeaveManager';
import ApprovalsQueue from '../pages/approvals/ApprovalsQueue';
import Reports from '../pages/reports/Reports';
import Settings from '../pages/settings/Settings';
import Profile from '../pages/profile/Profile';
import Documents from '../pages/documents/Documents';

// Premium Module Page Imports
import Payroll from '../pages/premium/Payroll';
import Performance from '../pages/premium/Performance';
import Recruitment from '../pages/premium/Recruitment';
import Onboarding from '../pages/premium/Onboarding';
import Expenses from '../pages/premium/Expenses';
import Training from '../pages/premium/Training';
import Assets from '../pages/premium/Assets';
import Tickets from '../pages/premium/Tickets';
import AIAdvisory from '../pages/premium/AIAdvisory';
import PublicJobs from '../pages/premium/PublicJobs';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/jobs/:subdomain" element={<PublicJobs />} />

        {/* Protected Routes — shared layout stays mounted while navigating */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/documents" element={<Documents />} />
            <Route
              path="/employees"
              element={
                <RoleRoute allowedRoles={['HR_ADMIN', 'LEADERSHIP']}>
                  <EmployeeList />
                </RoleRoute>
              }
            />
            <Route
              path="/org-chart"
              element={
                <RoleRoute allowedRoles={['HR_ADMIN', 'LEADERSHIP']}>
                  <OrgChart />
                </RoleRoute>
              }
            />
            <Route path="/attendance" element={<AttendanceRecords />} />
            <Route path="/leave" element={<LeaveManager />} />
            <Route
              path="/approvals"
              element={
                <RoleRoute allowedRoles={['MANAGER', 'HR_ADMIN', 'LEADERSHIP']}>
                  <ApprovalsQueue />
                </RoleRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleRoute allowedRoles={['HR_ADMIN', 'LEADERSHIP']}>
                  <Reports />
                </RoleRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <RoleRoute allowedRoles={['HR_ADMIN']}>
                  <Settings />
                </RoleRoute>
              }
            />

            {/* Premium Modules */}
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/recruitment" element={<Recruitment />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/training" element={<Training />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route
              path="/ai-advisory"
              element={
                <RoleRoute allowedRoles={['HR_ADMIN', 'LEADERSHIP']}>
                  <AIAdvisory />
                </RoleRoute>
              }
            />
          </Route>
        </Route>

        {/* Fallback Redirects */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
