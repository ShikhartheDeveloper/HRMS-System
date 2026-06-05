import React, { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import {
  Users,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  Calendar,
  Clock,
  CheckSquare,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    activeEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    leavesApproved: 0,
    attritionRate: 0,
  });

  const [punchStatus, setPunchStatus] = useState(null); // 'IN', 'OUT', or null
  const [loadingPunch, setLoadingPunch] = useState(false);
  const [approvals, setApprovals] = useState([]);
  const [myLeaveBalance, setMyLeaveBalance] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // 1. Fetch Admin / Leadership analytics
    if (['HR_ADMIN', 'LEADERSHIP'].includes(user?.role)) {
      Promise.allSettled([
        api.get('/reports/headcount'),
        api.get('/reports/attendance-summary'),
        api.get('/reports/attrition')
      ]).then(([headcountRes, attendanceRes, attritionRes]) => {
        setStats({
          activeEmployees: headcountRes.value?.data?.data?.totalActive || 0,
          presentToday: attendanceRes.value?.data?.data?.present || 0,
          lateToday: attendanceRes.value?.data?.data?.late || 0,
          leavesApproved: attendanceRes.value?.data?.data?.onLeave || 0,
          attritionRate: attritionRes.value?.data?.data?.attritionRate || 0,
        });
      });
    }

    // 2. Fetch pending approvals (for Manager, HR Admin, Leadership)
    if (['MANAGER', 'HR_ADMIN', 'LEADERSHIP'].includes(user?.role)) {
      api.get('/leave/pending-approvals')
        .then(res => {
          if (res.data.success) {
            setApprovals(res.data.data);
          }
        })
        .catch(err => console.error(err));
    }

    // 3. Fetch employee leave balances
    api.get('/leave/balance')
      .then(res => {
        if (res.data.success) {
          const rem = res.data.data.remaining;
          const balancesList = Object.keys(rem).map(key => ({
            name: key,
            days: rem[key]
          }));
          setMyLeaveBalance(balancesList);
        }
      })
      .catch(err => console.error(err));

    // 4. Check punch status of today
    api.get('/attendance/my-records')
      .then(res => {
        if (res.data.success && res.data.data.length > 0) {
          const todayLog = res.data.data[0];
          const logDate = new Date(todayLog.date).toDateString();
          const todayDate = new Date().toDateString();

          if (logDate === todayDate) {
            if (todayLog.punchIn && !todayLog.punchOut) {
              setPunchStatus('IN');
            } else if (todayLog.punchIn && todayLog.punchOut) {
              setPunchStatus('OUT');
            }
          }
        }
      })
      .catch(err => console.error(err));
  }, [user]);

  const handlePunchAction = async (actionType) => {
    setLoadingPunch(true);
    try {
      // Send mock gps details
      const gps = { latitude: 12.9716, longitude: 77.5946 };
      const res = await api.post(`/attendance/punch-${actionType}`, { gps });
      if (res.data.success) {
        setPunchStatus(actionType === 'in' ? 'IN' : 'OUT');
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Clock punch action failed');
    } finally {
      setLoadingPunch(false);
    }
  };

  const handleApproveLeave = async (id, decision) => {
    try {
      const res = await api.put(`/leave/${id}/approve`, { status: decision, comments: 'Reviewed from dashboard' });
      if (res.data.success) {
        setApprovals(approvals.filter(a => a._id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Review failed');
    }
  };

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-8 text-left">
        {/* Welcome Section */}
        <div className="bg-surface p-6 rounded-card border border-borderColor shadow-custom flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-textPrimary">
              Welcome back, {user?.email.split('@')[0]}!
            </h2>
            <p className="text-sm text-textSecondary">
              Your role context is set to <strong className="text-primary font-semibold">{user?.role}</strong>. Here is your team summary for today.
            </p>
          </div>

          {/* Clock In / Out widget (For Employee daily action) */}
          <div className="flex items-center gap-3 bg-background p-3 rounded-button border border-borderColor">
            <div className="flex flex-col text-left pr-4 border-r border-borderColor">
              <span className="text-[10px] text-textSecondary font-semibold uppercase">Punch Status</span>
              <span className="text-[12px] font-semibold text-textPrimary">
                {punchStatus === 'IN' ? 'Punched In' : punchStatus === 'OUT' ? 'Punched Out' : 'Not Clocked In'}
              </span>
            </div>
            {punchStatus !== 'OUT' && (
              <button
                onClick={() => handlePunchAction(punchStatus === 'IN' ? 'out' : 'in')}
                disabled={loadingPunch}
                className={`px-4 h-9 rounded-button text-xs font-semibold cursor-pointer transition-all shadow-sm ${
                  punchStatus === 'IN'
                    ? 'bg-danger hover:bg-red-600 text-white'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {loadingPunch ? 'Saving...' : punchStatus === 'IN' ? 'Punch Out' : 'Punch In'}
              </button>
            )}
          </div>
        </div>

        {/* Analytical Cards Row (Admin / Leadership view) */}
        {['HR_ADMIN', 'LEADERSHIP'].includes(user?.role) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stat 1 */}
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block">Total Headcount</span>
                <span className="text-2xl font-bold text-textPrimary">{stats.activeEmployees}</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-full text-success">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block">Present Today</span>
                <span className="text-2xl font-bold text-textPrimary">{stats.presentToday}</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-full text-warning">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block">Late Punches</span>
                <span className="text-2xl font-bold text-textPrimary">{stats.lateToday}</span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom flex items-center gap-4">
              <div className="p-3 bg-danger/10 rounded-full text-danger">
                <TrendingDown className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block">Attrition Rate</span>
                <span className="text-2xl font-bold text-textPrimary">{stats.attritionRate}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Dashboards Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Middle: List panels */}
          <div className="lg:col-span-2 space-y-8">
            {/* Approvals Queue Widget */}
            {['MANAGER', 'HR_ADMIN', 'LEADERSHIP'].includes(user?.role) && (
              <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden">
                <div className="px-6 py-4 border-b border-borderColor flex justify-between items-center bg-background">
                  <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                    Pending Approvals ({approvals.length})
                  </h3>
                </div>
                <div className="p-2 max-h-80 overflow-y-auto">
                  {approvals.length === 0 ? (
                    <div className="py-12 text-center text-textSecondary text-xs">
                      All approval requests resolved. Great job!
                    </div>
                  ) : (
                    <div className="divide-y divide-borderColor">
                      {approvals.map((req) => (
                        <div key={req._id} className="py-3 px-4 flex justify-between items-center gap-4 hover:bg-background rounded-md transition-all">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold uppercase">
                              {req.employeeId ? req.employeeId.firstName.substring(0, 1) + req.employeeId.lastName.substring(0, 1) : 'EM'}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[13px] font-semibold text-textPrimary">
                                {req.employeeId ? `${req.employeeId.firstName} ${req.employeeId.lastName}` : 'Employee'}
                              </span>
                              <span className="text-[11px] text-textSecondary">
                                Applied: {req.totalDays} day(s) of {req.leaveType} ({new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()})
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveLeave(req._id, 'Approved')}
                              className="h-8 px-3 text-[11px] bg-success hover:bg-success/90 text-white rounded-button font-medium cursor-pointer transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproveLeave(req._id, 'Rejected')}
                              className="h-8 px-3 text-[11px] border border-danger text-danger hover:bg-danger/5 rounded-button font-medium cursor-pointer transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions / Shortcuts */}
            <div className="bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-4">
              <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Quick actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <a
                  href="/leave"
                  className="flex flex-col items-center justify-center p-4 rounded-button bg-background border border-borderColor hover:border-primary/40 text-center space-y-2 group transition-all"
                >
                  <Calendar className="h-5 w-5 text-primary group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-medium text-textPrimary">Apply Leave</span>
                </a>
                <a
                  href="/attendance"
                  className="flex flex-col items-center justify-center p-4 rounded-button bg-background border border-borderColor hover:border-primary/40 text-center space-y-2 group transition-all"
                >
                  <Clock className="h-5 w-5 text-primary group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-medium text-textPrimary">Clock Records</span>
                </a>
                {['HR_ADMIN', 'LEADERSHIP'].includes(user?.role) && (
                  <>
                    <a
                      href="/employees"
                      className="flex flex-col items-center justify-center p-4 rounded-button bg-background border border-borderColor hover:border-primary/40 text-center space-y-2 group transition-all"
                    >
                      <UserCheck className="h-5 w-5 text-primary group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-medium text-textPrimary">Add Employee</span>
                    </a>
                    <a
                      href="/reports"
                      className="flex flex-col items-center justify-center p-4 rounded-button bg-background border border-borderColor hover:border-primary/40 text-center space-y-2 group transition-all"
                    >
                      <CheckSquare className="h-5 w-5 text-primary group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-medium text-textPrimary">Run Reports</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Leave balances */}
          <div className="space-y-8">
            <div className="bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-4">
              <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-primary" />
                Remaining Leaves
              </h3>
              {myLeaveBalance.length === 0 ? (
                <div className="py-6 text-center text-textSecondary text-xs">
                  No leave quotas assigned.
                </div>
              ) : (
                <div className="space-y-3">
                  {myLeaveBalance.map((bal, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-button bg-background border border-borderColor hover:border-primary/25 transition-all">
                      <span className="text-xs font-semibold text-textPrimary">{bal.name} Leave</span>
                      <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-badge font-bold">
                        {bal.days} Days
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Dashboard;
