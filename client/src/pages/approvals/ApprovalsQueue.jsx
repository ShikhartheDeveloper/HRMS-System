import React, { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import { ShieldCheck, CheckSquare, XSquare, CheckCircle, AlertCircle } from 'lucide-react';

const ApprovalsQueue = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('leaves'); // 'leaves' or 'attendance'
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingRegs, setPendingRegs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchLeavesQueue = async () => {
    try {
      const res = await api.get('/leave/pending-approvals');
      if (res.data.success) {
        setPendingLeaves(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRegsQueue = async () => {
    try {
      const res = await api.get('/attendance/team-records', { params: { status: 'Pending' } });
      if (res.data.success) {
        setPendingRegs(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllQueues = async () => {
    setLoading(true);
    await Promise.all([fetchLeavesQueue(), fetchRegsQueue()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllQueues();
  }, [user]);

  const handleReviewLeave = async (id, status) => {
    try {
      const res = await api.put(`/leave/${id}/approve`, {
        status,
        comments: 'Reviewed from approvals queue'
      });
      if (res.data.success) {
        fetchLeavesQueue();
        setFeedback(`Leave request ${status.toLowerCase()} successfully!`);
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Action failed');
    }
  };

  const handleReviewReg = async (id, status) => {
    try {
      const res = await api.put(`/attendance/regularization/${id}/approve`, {
        status,
        comments: 'Reviewed from approvals queue'
      });
      if (res.data.success) {
        fetchRegsQueue();
        setFeedback(`Attendance regularization ${status.toLowerCase()} successfully!`);
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Action failed');
    }
  };

  return (
    <PageWrapper title="Approvals Queue">
      <div className="space-y-6 text-left animate-fade-in">
        {feedback && (
          <div className="flex gap-2 p-3.5 rounded-button bg-success/10 border border-success/30 text-success text-xs font-semibold">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Tab Selection Headers */}
        <div className="border-b border-borderColor flex gap-6">
          <button
            onClick={() => setActiveTab('leaves')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'leaves' ? 'border-b-2 border-primary text-textPrimary' : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Leaves ({pendingLeaves.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'attendance' ? 'border-b-2 border-primary text-textPrimary' : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Regularizations ({pendingRegs.length})
          </button>
        </div>

        {/* Queue List Content */}
        {activeTab === 'leaves' ? (
          <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden">
            <div className="divide-y divide-borderColor/60">
              {loading ? (
                <div className="py-12 text-center text-textSecondary text-xs">Loading queue...</div>
              ) : pendingLeaves.length === 0 ? (
                <div className="py-16 text-center text-textSecondary text-xs">No pending leave requests.</div>
              ) : (
                pendingLeaves.map((req) => (
                  <div key={req._id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-background/20 transition-all">
                    <div className="flex items-start gap-3 text-left">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {req.employeeId ? req.employeeId.firstName[0] + req.employeeId.lastName[0] : 'EM'}
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-[14px] text-textPrimary block">
                          {req.employeeId ? `${req.employeeId.firstName} ${req.employeeId.lastName}` : 'Employee'}
                        </span>
                        <span className="text-xs text-textSecondary block">
                          Department: {req.employeeId?.department} • Designation: {req.employeeId?.designation}
                        </span>
                        <p className="text-xs text-textSecondary bg-background p-2.5 rounded border border-borderColor/55 inline-block mt-2">
                          <strong>{req.leaveType} Leave:</strong> {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()} ({req.totalDays} day(s)) <br />
                          <span className="italic">" {req.reason} "</span>
                        </p>
                      </div>
                    </div>
                    {user?.role === 'LEADERSHIP' ? (
                      <div className="shrink-0 text-[11px] bg-warning/10 text-warning px-3 py-1.5 rounded-badge font-semibold">
                        Read Only Review Access
                      </div>
                    ) : (
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          onClick={() => handleReviewLeave(req._id, 'Approved')}
                          className="h-9 px-4 bg-success hover:bg-success/90 text-white text-xs font-semibold rounded-button cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckSquare className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewLeave(req._id, 'Rejected')}
                          className="h-9 px-4 border border-danger text-danger hover:bg-danger/5 text-xs font-semibold rounded-button cursor-pointer flex items-center gap-1.5"
                        >
                          <XSquare className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden">
            <div className="divide-y divide-borderColor/60">
              {loading ? (
                <div className="py-12 text-center text-textSecondary text-xs">Loading queue...</div>
              ) : pendingRegs.length === 0 ? (
                <div className="py-16 text-center text-textSecondary text-xs">No pending regularization requests.</div>
              ) : (
                pendingRegs.map((req) => (
                  <div key={req._id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-background/20 transition-all">
                    <div className="flex items-start gap-3 text-left">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {req.employeeId ? req.employeeId.firstName[0] + req.employeeId.lastName[0] : 'EM'}
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-[14px] text-textPrimary block">
                          {req.employeeId ? `${req.employeeId.firstName} ${req.employeeId.lastName}` : 'Employee'}
                        </span>
                        <span className="text-xs text-textSecondary block">
                          Department: {req.employeeId?.department} • Designation: {req.employeeId?.designation}
                        </span>
                        <div className="text-xs text-textSecondary bg-background p-2.5 rounded border border-borderColor/55 inline-block mt-2">
                          <strong>Clock Adjustment:</strong> {new Date(req.date).toLocaleDateString()} <br />
                          <span>Requested Hours: {req.regularization.requestedPunchIn ? new Date(req.regularization.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'} - {req.regularization.requestedPunchOut ? new Date(req.regularization.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</span> <br />
                          <span className="italic">" {req.regularization.reason} "</span>
                        </div>
                      </div>
                    </div>
                    {user?.role === 'LEADERSHIP' ? (
                      <div className="shrink-0 text-[11px] bg-warning/10 text-warning px-3 py-1.5 rounded-badge font-semibold">
                        Read Only Review Access
                      </div>
                    ) : (
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          onClick={() => handleReviewReg(req._id, 'Approved')}
                          className="h-9 px-4 bg-success hover:bg-success/90 text-white text-xs font-semibold rounded-button cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckSquare className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewReg(req._id, 'Rejected')}
                          className="h-9 px-4 border border-danger text-danger hover:bg-danger/5 text-xs font-semibold rounded-button cursor-pointer flex items-center gap-1.5"
                        >
                          <XSquare className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ApprovalsQueue;
