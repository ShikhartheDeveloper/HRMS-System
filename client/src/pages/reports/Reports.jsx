import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import {
  BarChart3,
  Users,
  Clock,
  Calendar,
  TrendingDown,
  Download,
  CheckCircle,
  Loader2
} from 'lucide-react';

const Reports = () => {
  const [headcount, setHeadcount] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [leaveUsage, setLeaveUsage] = useState([]);
  const [attrition, setAttrition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportStatus, setExportStatus] = useState(''); // 'pending', 'completed', 'failed'
  const [exportUrl, setExportUrl] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [hRes, aRes, lRes, atRes] = await Promise.all([
          api.get('/reports/headcount'),
          api.get('/reports/attendance-summary'),
          api.get('/reports/leave-usage'),
          api.get('/reports/attrition')
        ]);

        if (hRes.data.success) setHeadcount(hRes.data.data);
        if (aRes.data.success) setAttendance(aRes.data.data);
        if (lRes.data.success) setLeaveUsage(lRes.data.data);
        if (atRes.data.success) setAttrition(atRes.data.data);
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

        {/* Headcount Overview */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-primary" />
            Headcount Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Active Employees</span>
              <span className="text-3xl font-extrabold text-textPrimary">{headcount?.totalActive || 0}</span>
            </div>
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Terminated</span>
              <span className="text-3xl font-extrabold text-danger">{headcount?.totalTerminated || 0}</span>
            </div>
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Departments</span>
              <span className="text-3xl font-extrabold text-primary">{headcount?.departmentDistribution?.length || 0}</span>
            </div>
          </div>

          {/* Department Breakdown Bar */}
          {headcount?.departmentDistribution?.length > 0 && (
            <div className="bg-surface p-6 rounded-card border border-borderColor shadow-custom space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider">Department Distribution</h3>
                <button
                  onClick={() => handleExport('headcount')}
                  className="h-8 px-3 border border-borderColor hover:bg-background text-textPrimary rounded-button text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
              <div className="space-y-3">
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
                      <div className="w-full bg-background rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
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
              { label: 'Present', value: attendance?.present || 0, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Late', value: attendance?.late || 0, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'On Leave', value: attendance?.onLeave || 0, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Absent', value: attendance?.absent || 0, color: 'text-danger', bg: 'bg-danger/10' },
              { label: 'Total Active', value: attendance?.totalActive || 0, color: 'text-textPrimary', bg: 'bg-background' }
            ].map((item, idx) => (
              <div key={idx} className={`p-4 rounded-card border border-borderColor shadow-custom ${item.bg}`}>
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
          <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-borderColor">
                  <th className="px-6 py-3">Leave Type</th>
                  <th className="px-6 py-3">Total Requests</th>
                  <th className="px-6 py-3">Total Days Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor/60 text-[13px]">
                {leaveUsage.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-textSecondary text-xs">No leave usage data for this period.</td>
                  </tr>
                ) : (
                  leaveUsage.map((lu, idx) => (
                    <tr key={idx} className="hover:bg-background/40 transition-colors">
                      <td className="px-6 py-3 font-semibold text-textPrimary">{lu.leaveType}</td>
                      <td className="px-6 py-3 text-textSecondary">{lu.count}</td>
                      <td className="px-6 py-3 font-bold text-textPrimary">{lu.totalDays}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-borderColor flex justify-end bg-background/50">
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

        {/* Attrition */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <TrendingDown className="h-4.5 w-4.5 text-primary" />
            Attrition Analysis
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Active</span>
              <span className="text-3xl font-extrabold text-success">{attrition?.active || 0}</span>
            </div>
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Terminated</span>
              <span className="text-3xl font-extrabold text-danger">{attrition?.terminated || 0}</span>
            </div>
            <div className="bg-surface p-5 rounded-card border border-borderColor shadow-custom relative overflow-hidden">
              <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mb-1">Attrition Rate</span>
              <span className="text-3xl font-extrabold text-textPrimary">{attrition?.attritionRate || 0}%</span>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-background">
                <div
                  className="h-full bg-danger transition-all duration-700"
                  style={{ width: `${Math.min(attrition?.attritionRate || 0, 100)}%` }}
                ></div>
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
      </div>
    </PageWrapper>
  );
};

export default Reports;
