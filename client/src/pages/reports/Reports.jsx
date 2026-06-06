import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import useAuthStore from '../../store/authStore';
import {
  BarChart3,
  Users,
  Clock,
  Calendar,
  TrendingDown,
  Download,
  CheckCircle,
  Loader2,
  IndianRupee
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const Reports = () => {
  const { user } = useAuthStore();
  const [headcount, setHeadcount] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [leaveUsage, setLeaveUsage] = useState([]);
  const [attrition, setAttrition] = useState(null);
  const [salaryFlow, setSalaryFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportStatus, setExportStatus] = useState(''); // 'pending', 'completed', 'failed'
  const [exportUrl, setExportUrl] = useState('');
  const [feedback, setFeedback] = useState('');

  const COLORS = ['#4F46E5', '#0D9488', '#10B981', '#F59E0B', '#3B82F6', '#6366F1', '#14B8A6'];

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [hRes, aRes, lRes, atRes, sRes] = await Promise.all([
          api.get('/reports/headcount'),
          api.get('/reports/attendance-summary'),
          api.get('/reports/leave-usage'),
          api.get('/reports/attrition'),
          api.get('/reports/salary-flow')
        ]);

        if (hRes.data.success) setHeadcount(hRes.data.data);
        if (aRes.data.success) setAttendance(aRes.data.data);
        if (lRes.data.success) setLeaveUsage(lRes.data.data);
        if (atRes.data.success) setAttrition(atRes.data.data);
        if (sRes.data.success) setSalaryFlow(sRes.data.data);
      } catch (err) {
        console.error('Reports fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleExport = async (type) => {
    setExportStatus('pending');
    setExportUrl('');
    try {
      const res = await api.post('/reports/export', { type });
      if (res.data.success) {
        const jobId = res.data.data.jobId;
        setFeedback('Export job started. Checking status...');

        // Poll for completion (simple 3-second delay then check)
        setTimeout(async () => {
          try {
            const statusRes = await api.get(`/reports/export-status/${jobId}`);
            if (statusRes.data.success) {
              const job = statusRes.data.data;
              if (job.status === 'Completed') {
                setExportStatus('completed');
                setExportUrl(job.resultUrl);
                setFeedback('Export ready for download!');
              } else if (job.status === 'Failed') {
                setExportStatus('failed');
                setFeedback('Export failed: ' + job.error);
              } else {
                setExportStatus('pending');
                setFeedback('Export still processing. Please check back in a moment.');
              }
            }
          } catch (pollErr) {
            setExportStatus('failed');
            setFeedback('Failed to check export status.');
          }
          setTimeout(() => setFeedback(''), 5000);
        }, 3000);
      }
    } catch (err) {
      setExportStatus('failed');
      setFeedback(err.response?.data?.error?.message || 'Export failed');
      setTimeout(() => setFeedback(''), 4000);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Reports & Analytics">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <span className="text-sm text-textSecondary">Loading analytics...</span>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Map headcount distribution to PieChart data
  const pieData = headcount?.departmentDistribution?.map(dept => ({
    name: dept.department,
    value: dept.count
  })) || [];

  // Map leave usage list to BarChart data
  const leaveUsageChartData = leaveUsage.map(lu => ({
    name: lu.leaveType,
    days: lu.totalDays
  }));

  return (
    <PageWrapper title="Reports & Analytics">
      <div className="space-y-8 text-left animate-fade-in">
        {feedback && (
          <div className="flex gap-2 p-3.5 rounded-button bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
            {exportStatus === 'pending' ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback}</span>
            {exportUrl && (
              <a
                href={exportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 underline font-bold"
              >
                Download CSV
              </a>
            )}
          </div>
        )}

        {/* Global Export Header */}
        <div className="flex justify-between items-center bg-surface border border-borderColor rounded-card p-6 shadow-custom flex-wrap gap-4 hover:shadow-glow hover:border-primary/10 transition-all duration-200">
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-textPrimary">Reports & Export Control Portal</h2>
            <p className="text-[12px] text-textSecondary mt-0.5">Download structured data sheets and audits for payroll, attendance, leave, and complete workforce directories.</p>
          </div>
          <button
            onClick={() => handleExport('headcount')}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Download Complete Employee Roster
          </button>
        </div>

        {/* Headcount Overview */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-primary" />
            Headcount Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom hover:shadow-glow hover:border-primary/15 transition-all duration-200">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Active Employees</span>
              <span className="text-3xl font-extrabold text-textPrimary">{headcount?.totalActive || 0}</span>
            </div>
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom hover:shadow-glow hover:border-danger/15 transition-all duration-200">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Terminated</span>
              <span className="text-3xl font-extrabold text-danger">{headcount?.totalTerminated || 0}</span>
            </div>
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom hover:shadow-glow hover:border-primary/15 transition-all duration-200">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Departments</span>
              <span className="text-3xl font-extrabold text-primary">{headcount?.departmentDistribution?.length || 0}</span>
            </div>
          </div>

          {/* Department Breakdown with Pie Chart side-by-side */}
          {headcount?.departmentDistribution?.length > 0 && (
            <div className="bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-4">
              <div className="flex justify-between items-center border-b border-borderColor/60 pb-3">
                <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider">Department Distribution</h3>
                <button
                  onClick={() => handleExport('headcount')}
                  className="h-8 px-3 border border-borderColor hover:bg-background text-textPrimary rounded-button text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-2">
                {/* Recharts PieChart component */}
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Progress bar department list */}
                <div className="space-y-4">
                  {headcount.departmentDistribution.map((dept, idx) => {
                    const percentage = headcount.totalActive > 0
                      ? Math.round((dept.count / headcount.totalActive) * 100)
                      : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-textPrimary">{dept.department}</span>
                          <span className="text-textSecondary font-medium">{dept.count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[idx % COLORS.length]
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-primary" />
            Today's Attendance
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Present', value: attendance?.present || 0, color: 'text-success', bg: 'bg-success/5 hover:border-success/30' },
              { label: 'Late', value: attendance?.late || 0, color: 'text-warning', bg: 'bg-warning/5 hover:border-warning/30' },
              { label: 'On Leave', value: attendance?.onLeave || 0, color: 'text-primary', bg: 'bg-primary/5 hover:border-primary/30' },
              { label: 'Absent', value: attendance?.absent || 0, color: 'text-danger', bg: 'bg-danger/5 hover:border-danger/30' },
              { label: 'Total Active', value: attendance?.totalActive || 0, color: 'text-textPrimary', bg: 'bg-slate-50 hover:border-slate-300' }
            ].map((item, idx) => (
              <div key={idx} className={`p-4 rounded-card border border-borderColor/70 shadow-custom transition-all duration-200 ${item.bg}`}>
                <span className="text-[10px] font-semibold text-textSecondary uppercase tracking-wider block">{item.label}</span>
                <span className={`text-2xl font-extrabold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => handleExport('attendance-summary')}
              className="h-8 px-3 border border-borderColor hover:bg-background text-textPrimary rounded-button text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export Attendance CSV
            </button>
          </div>
        </div>

        {/* Leave Usage */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-primary" />
            Leave Usage (Year-to-Date)
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side: BarChart */}
            <div className="lg:col-span-2 bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-4 hover:shadow-glow hover:border-primary/10 transition-all duration-200">
              <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider">Leave Types Allocation (Total Days Used)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveUsageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="days" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={24}>
                      {leaveUsageChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right side: Detailed Table */}
            <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden flex flex-col justify-between hover:shadow-glow hover:border-primary/5 transition-all duration-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-borderColor">
                    <th className="px-5 py-3.5">Leave Type</th>
                    <th className="px-5 py-3.5">Requests</th>
                    <th className="px-5 py-3.5">Days Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor/50 text-[13px]">
                  {leaveUsage.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-12 text-textSecondary text-xs">No leave usage data.</td>
                    </tr>
                  ) : (
                    leaveUsage.map((lu, idx) => (
                      <tr key={idx} className="hover:bg-background/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-textPrimary">{lu.leaveType}</td>
                        <td className="px-5 py-3.5 text-textSecondary">{lu.count}</td>
                        <td className="px-5 py-3.5 font-extrabold text-primary">{lu.totalDays}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="px-5 py-3.5 border-t border-borderColor/60 flex justify-end bg-slate-50/50">
                <button
                  onClick={() => handleExport('leave-usage')}
                  className="h-8 px-3 border border-borderColor hover:bg-surface text-textPrimary rounded-button text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Leave CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Attrition */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <TrendingDown className="h-4.5 w-4.5 text-primary" />
            Attrition Analysis
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom hover:shadow-glow hover:border-success/15 transition-all duration-200">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Active Employees</span>
              <span className="text-3xl font-extrabold text-success">{attrition?.active || 0}</span>
            </div>
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom hover:shadow-glow hover:border-danger/15 transition-all duration-200">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Terminated</span>
              <span className="text-3xl font-extrabold text-danger">{attrition?.terminated || 0}</span>
            </div>
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom relative overflow-hidden flex flex-col justify-between h-full hover:shadow-glow hover:border-primary/10 transition-all duration-200">
              <div>
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Attrition Rate</span>
                <span className="text-3xl font-extrabold text-textPrimary">{attrition?.attritionRate || 0}%</span>
              </div>
              <div className="space-y-1 mt-4">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60">
                  <div
                    className="h-full bg-gradient-to-r from-success via-warning to-danger transition-all duration-700 animate-pulse-slow"
                    style={{ width: `${Math.min(attrition?.attritionRate || 0, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-textSecondary font-bold">
                  <span>Healthy (0-5%)</span>
                  <span>Caution (5-15%)</span>
                  <span>Critical (15%+)</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => handleExport('attrition')}
              className="h-8 px-3 border border-borderColor hover:bg-background text-textPrimary rounded-button text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export Attrition CSV
            </button>
          </div>
        </div>

        {/* Salary & Workforce Cost Insights */}
        {salaryFlow && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2 border-t border-borderColor/55 pt-6">
              <IndianRupee className="h-4.5 w-4.5 text-primary" />
              Salary & Workforce Cost Insights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom hover:shadow-glow hover:border-primary/15 transition-all duration-200">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Total Payroll Flow (Sum)</span>
                <span className="text-3xl font-extrabold text-textPrimary">₹{salaryFlow.totalSalary?.toLocaleString()} / yr</span>
              </div>
              <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom hover:shadow-glow hover:border-primary/15 transition-all duration-200">
                <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Average Salary Flow</span>
                <span className="text-3xl font-extrabold text-primary">₹{salaryFlow.averageSalary?.toLocaleString()} / yr</span>
              </div>
            </div>

            {/* Department Payroll Breakdown */}
            {salaryFlow.departmentSalaryDistribution?.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
                {/* Recharts BarChart */}
                <div className="lg:col-span-2 bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-4 hover:shadow-glow hover:border-primary/10 transition-all duration-200 text-left">
                  <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider">Department Payroll Allocation</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salaryFlow.departmentSalaryDistribution.map(item => ({ name: item.department, salary: item.totalSalary }))} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val.toLocaleString()}`} />
                        <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Payroll']} contentStyle={{ background: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="salary" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={28}>
                          {salaryFlow.departmentSalaryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Table Breakdown */}
                <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden flex flex-col justify-between hover:shadow-glow hover:border-primary/5 transition-all duration-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-borderColor">
                        <th className="px-5 py-3.5">Department</th>
                        <th className="px-5 py-3.5">Headcount</th>
                        <th className="px-5 py-3.5">Total Payroll</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderColor/50 text-[13px]">
                      {salaryFlow.departmentSalaryDistribution.map((item, idx) => (
                        <tr key={idx} className="hover:bg-background/40 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-textPrimary">{item.department}</td>
                          <td className="px-5 py-3.5 text-textSecondary">{item.count}</td>
                          <td className="px-5 py-3.5 font-extrabold text-primary">₹{item.totalSalary?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3.5 border-t border-borderColor/60 flex justify-end bg-slate-50/50">
                    <button
                      onClick={() => handleExport('salary-flow')}
                      className="h-8 px-3 border border-borderColor hover:bg-surface text-textPrimary rounded-button text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export Payroll CSV
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default Reports;
