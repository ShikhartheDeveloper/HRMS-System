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
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

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

  // Static Mock Attendance Data for rendering AreaChart
  const attendanceChartData = [
    { day: 'Mon', rate: 92 },
    { day: 'Tue', rate: 95 },
    { day: 'Wed', rate: 93 },
    { day: 'Thu', rate: 96 },
    { day: 'Fri', rate: 94 },
  ];

  // Dynamic Leaves balance Mapper for BarChart
  const leaveQuotasChartData = myLeaveBalance.map(b => {
    let allocated = 12;
    const lowerName = b.name.toLowerCase();
    if (lowerName.includes('sick')) allocated = 10;
    else if (lowerName.includes('earned')) allocated = 15;
    else if (lowerName.includes('casual')) allocated = 12;
    return {
      name: b.name.charAt(0).toUpperCase() + b.name.slice(1),
      Allocated: allocated,
      Remaining: b.days
    };
  });

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-8 text-left animate-fade-in">
        {/* Welcome Section Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary-hover to-accent text-white p-6 md:p-8 rounded-card border border-primary/10 shadow-lg shadow-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-accent/25 rounded-full blur-xl pointer-events-none" />
          
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Welcome back, {user?.email.split('@')[0]}!
            </h2>
            <p className="text-sm text-slate-100/90 leading-relaxed max-w-xl">
              Your role context is set to <strong className="text-white font-bold underline decoration-accent underline-offset-4">{user?.role}</strong>. Here is your team summary for today.
            </p>
          </div>

          {/* Clock In / Out widget (For Employee daily action) */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-3.5 rounded-button border border-white/20 relative z-10">
            <div className="flex flex-col text-left pr-4 border-r border-white/20">
              <span className="text-[10px] text-slate-200 font-bold uppercase tracking-wider">Punch Status</span>
              <span className="text-[13px] font-bold text-white">
                {punchStatus === 'IN' ? 'Punched In' : punchStatus === 'OUT' ? 'Punched Out' : 'Not Clocked In'}
              </span>
            </div>
            {punchStatus !== 'OUT' && (
              <button
                onClick={() => handlePunchAction(punchStatus === 'IN' ? 'out' : 'in')}
                disabled={loadingPunch}
                className={`px-5 h-10 rounded-button text-xs font-bold cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-md ${
                  punchStatus === 'IN'
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                    : 'bg-white text-primary hover:bg-slate-50 shadow-white/20'
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
            <div className="bg-surface p-5 rounded-card border border-borderColor/65 shadow-custom border-l-4 border-l-primary hover:shadow-glow hover:border-primary/20 transition-all duration-200 flex items-center gap-4">
              <div className="p-3.5 bg-primary/10 rounded-xl text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block">Total Headcount</span>
                <span className="text-2xl font-bold text-textPrimary">{stats.activeEmployees}</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-surface p-5 rounded-card border border-borderColor/65 shadow-custom border-l-4 border-l-success hover:shadow-glow hover:border-success/20 transition-all duration-200 flex items-center gap-4">
              <div className="p-3.5 bg-success/10 rounded-xl text-success">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block">Present Today</span>
                <span className="text-2xl font-bold text-textPrimary">{stats.presentToday}</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-surface p-5 rounded-card border border-borderColor/65 shadow-custom border-l-4 border-l-warning hover:shadow-glow hover:border-warning/20 transition-all duration-200 flex items-center gap-4">
              <div className="p-3.5 bg-warning/10 rounded-xl text-warning">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block">Late Punches</span>
                <span className="text-2xl font-bold text-textPrimary">{stats.lateToday}</span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-surface p-5 rounded-card border border-borderColor/65 shadow-custom border-l-4 border-l-danger hover:shadow-glow hover:border-danger/20 transition-all duration-200 flex items-center gap-4">
              <div className="p-3.5 bg-danger/10 rounded-xl text-danger">
                <TrendingDown className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block">Attrition Rate</span>
                <span className="text-2xl font-bold text-textPrimary">{stats.attritionRate}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Charts & Analytical Visualizations */}
        {['HR_ADMIN', 'LEADERSHIP'].includes(user?.role) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Weekly Attendance Rate AreaChart */}
            <div className="bg-surface p-6 rounded-card border border-borderColor/65 shadow-custom space-y-4 hover:shadow-glow hover:border-primary/10 transition-all duration-200">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs text-textPrimary uppercase tracking-wider">Weekly Attendance Trend</h3>
                <span className="text-[11px] bg-success/15 text-success font-semibold px-2 py-0.5 rounded">Avg: 94%</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendanceColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[80, 100]} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="rate" stroke="#4F46E5" strokeWidth={2.5} fillOpacity={1} fill="url(#attendanceColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Remaining Leave Quotas BarChart */}
            <div className="bg-surface p-6 rounded-card border border-borderColor/65 shadow-custom space-y-4 hover:shadow-glow hover:border-accent/10 transition-all duration-200">
              <h3 className="font-bold text-xs text-textPrimary uppercase tracking-wider">Leave Quotas Allocation</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveQuotasChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '10px' }} />
                    <Bar dataKey="Allocated" name="Total Allocated" fill="#E2E8F0" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="Remaining" name="Days Remaining" fill="#0D9488" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
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
              <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden hover:shadow-glow hover:border-primary/5 transition-all duration-300">
                <div className="px-6 py-4.5 border-b border-borderColor flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-xs text-textPrimary uppercase tracking-wider flex items-center gap-2">
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
                    <div className="divide-y divide-borderColor/60">
                      {approvals.map((req) => (
                        <div key={req._id} className="py-3.5 px-4 flex justify-between items-center gap-4 hover:bg-background/80 rounded-md transition-all">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary/10 to-accent/10 flex items-center justify-center text-primary text-xs font-bold uppercase shadow-sm">
                              {req.employeeId ? req.employeeId.firstName.substring(0, 1) + req.employeeId.lastName.substring(0, 1) : 'EM'}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[13px] font-bold text-textPrimary">
                                {req.employeeId ? `${req.employeeId.firstName} ${req.employeeId.lastName}` : 'Employee'}
                              </span>
                              <span className="text-[11px] text-textSecondary font-medium">
                                Applied: {req.totalDays} day(s) of {req.leaveType} ({new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()})
                              </span>
                            </div>
                          </div>
                          {user?.role === 'LEADERSHIP' ? (
                            <span className="text-[11px] bg-warning/10 text-warning px-2.5 py-1 rounded-badge font-semibold">
                              Pending Review
                            </span>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveLeave(req._id, 'Approved')}
                                className="h-8 px-3.5 text-[11px] bg-success hover:bg-success/90 text-white rounded-button font-bold cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-success/15"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproveLeave(req._id, 'Rejected')}
                                className="h-8 px-3.5 text-[11px] border border-danger text-danger hover:bg-danger/5 rounded-button font-bold cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions / Shortcuts */}
            <div className="bg-surface p-6 rounded-card border border-borderColor/80 shadow-custom space-y-4">
              <h3 className="font-bold text-xs text-textPrimary uppercase tracking-wider">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <a
                  href="/leave"
                  className="flex flex-col items-center justify-center p-5 rounded-button bg-background border border-borderColor hover:border-primary/45 text-center space-y-2 group transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-primary/5"
                >
                  <Calendar className="h-6.5 w-6.5 text-primary group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-xs font-bold text-textPrimary">Apply Leave</span>
                </a>
                <a
                  href="/attendance"
                  className="flex flex-col items-center justify-center p-5 rounded-button bg-background border border-borderColor hover:border-primary/45 text-center space-y-2 group transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-primary/5"
                >
                  <Clock className="h-6.5 w-6.5 text-primary group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-xs font-bold text-textPrimary">Clock Records</span>
                </a>
                {user?.role === 'HR_ADMIN' && (
                  <a
                    href="/employees"
                    className="flex flex-col items-center justify-center p-5 rounded-button bg-background border border-borderColor hover:border-primary/45 text-center space-y-2 group transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-primary/5"
                  >
                    <UserCheck className="h-6.5 w-6.5 text-primary group-hover:scale-110 transition-transform duration-200" />
                    <span className="text-xs font-bold text-textPrimary">Add Employee</span>
                  </a>
                )}
                {user?.role === 'LEADERSHIP' && (
                  <a
                    href="/employees"
                    className="flex flex-col items-center justify-center p-5 rounded-button bg-background border border-borderColor hover:border-primary/45 text-center space-y-2 group transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-primary/5"
                  >
                    <Users className="h-6.5 w-6.5 text-primary group-hover:scale-110 transition-transform duration-200" />
                    <span className="text-xs font-bold text-textPrimary">Employees</span>
                  </a>
                )}
                {['HR_ADMIN', 'LEADERSHIP'].includes(user?.role) && (
                  <a
                    href="/reports"
                    className="flex flex-col items-center justify-center p-5 rounded-button bg-background border border-borderColor hover:border-primary/45 text-center space-y-2 group transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-primary/5"
                  >
                    <CheckSquare className="h-6.5 w-6.5 text-primary group-hover:scale-110 transition-transform duration-200" />
                    <span className="text-xs font-bold text-textPrimary">Run Reports</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Leave balances */}
          <div className="space-y-8">
            <div className="bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-4 hover:shadow-glow hover:border-primary/5 transition-all duration-300">
              <h3 className="font-bold text-xs text-textPrimary uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-primary" />
                Remaining Leaves
              </h3>
              {myLeaveBalance.length === 0 ? (
                <div className="py-6 text-center text-textSecondary text-xs">
                  No leave quotas assigned.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {myLeaveBalance.map((bal, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 rounded-button bg-background border border-borderColor hover:border-primary/20 hover:bg-white transition-all duration-200">
                      <span className="text-xs font-bold text-textPrimary">{bal.name} Leave</span>
                      <span className="text-xs bg-primary/10 text-primary px-3.5 py-1 rounded-badge font-extrabold">
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
