import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';

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

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <PrivateRoute>
              <Documents />
            </PrivateRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['HR_ADMIN', 'LEADERSHIP']}>
                <EmployeeList />
              </RoleRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/org-chart"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['HR_ADMIN', 'LEADERSHIP']}>
                <OrgChart />
              </RoleRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <PrivateRoute>
              <AttendanceRecords />
            </PrivateRoute>
          }
        />
        <Route
          path="/leave"
          element={
            <PrivateRoute>
              <LeaveManager />
            </PrivateRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['MANAGER', 'HR_ADMIN', 'LEADERSHIP']}>
                <ApprovalsQueue />
              </RoleRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['HR_ADMIN', 'LEADERSHIP']}>
                <Reports />
              </RoleRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <Settings />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        {/* Fallback Redirects */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
