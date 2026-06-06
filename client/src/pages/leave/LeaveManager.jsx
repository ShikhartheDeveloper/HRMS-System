import React, { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  X,
  FileText
} from 'lucide-react';

const LeaveManager = () => {
  const { user } = useAuthStore();
  const [balances, setBalances] = useState({ quota: {}, used: {}, remaining: {} });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Form states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  const resetLeaveForm = () => {
    setLeaveType('Casual');
    setStartDate('');
    setEndDate('');
    setReason('');
    setFormError('');
  };

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const [balRes, histRes] = await Promise.all([
        api.get('/leave/balance'),
        api.get('/leave/history')
      ]);

      if (balRes.data.success) {
        setBalances(balRes.data.data);
      }
      if (histRes.data.success) {
        setHistory(histRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [user]);

  const handleOpenApply = () => {
    resetLeaveForm();
    setShowApplyModal(true);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const res = await api.post('/leave/apply', {
        leaveType,
        startDate,
        endDate,
        reason: reason.trim()
      });

      if (res.data.success) {
        setShowApplyModal(false);
        resetLeaveForm();
        fetchLeaveData();
        setFeedback('Leave application submitted successfully!');
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to apply for leave');
    }
  };

  const handleCancelLeave = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      const res = await api.put(`/leave/${id}/cancel`);
      if (res.data.success) {
        fetchLeaveData();
        setFeedback('Leave request cancelled.');
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Cancellation failed');
    }
  };

  const balanceCards = Object.keys(balances.remaining || {}).map(key => ({
    name: key,
    remaining: balances.remaining[key],
    quota: balances.quota[key] || 0,
    used: balances.used[key] || 0
  }));

  return (
    <PageWrapper title="Leave Center">
      <div className="space-y-6 text-left animate-fade-in">
        {feedback && (
          <div className="flex gap-2 p-3.5 rounded-button bg-success/10 border border-success/30 text-success text-xs font-semibold">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Leave Balances Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {balanceCards.map((bal, idx) => (
            <div key={idx} className="bg-surface p-5 rounded-card border border-borderColor shadow-custom flex flex-col justify-between h-32 relative overflow-hidden hover:border-primary/25 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">{bal.name} Leave</span>
                <span className="text-xs text-textSecondary font-semibold">Quota: {bal.quota}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-extrabold text-textPrimary">
                  {bal.name === 'Unpaid' ? bal.used : bal.remaining}
                </span>
                <span className="text-[10px] text-textSecondary font-medium">
                  {bal.name === 'Unpaid' ? 'Days taken' : 'Days left'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Header Action bar */}
        <div className="flex justify-between items-center bg-surface p-4 rounded-card border border-borderColor shadow-custom">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm text-textPrimary">Holiday Calendar & History</h3>
            <p className="text-xs text-textSecondary">
              Observe upcoming company holidays or apply for a time-off balance adjustment.
            </p>
          </div>
          <button
            onClick={handleOpenApply}
            className="h-10 px-5 bg-primary hover:bg-primary-hover text-white rounded-button text-xs font-semibold cursor-pointer shadow-sm transition-colors"
          >
            Apply Time Off
          </button>
        </div>

        {/* History Table */}
        <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden">
          <div className="px-6 py-4 border-b border-borderColor flex bg-background/50">
            <h3 className="font-bold text-xs text-textPrimary uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Time Off Request History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-borderColor">
                  <th className="px-6 py-4">Leave Type</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Reason & Review</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor/60 text-[13px]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-textSecondary text-xs">Loading logs...</td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-textSecondary text-xs">No leave requests filed yet.</td>
                  </tr>
                ) : (
                  history.map((l) => (
                    <tr key={l._id} className="hover:bg-background/40 transition-colors h-14">
                      <td className="px-6 py-2 font-semibold text-textPrimary">{l.leaveType}</td>
                      <td className="px-6 py-2 text-textSecondary">
                        {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-2 font-semibold text-textPrimary">{l.totalDays} day(s)</td>
                      <td className="px-6 py-2 text-left">
                        <div className="flex flex-col">
                          <span className="font-medium text-textPrimary">{l.reason}</span>
                          {l.comments && <span className="text-[10px] text-textSecondary">Note: {l.comments}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-2">
                        <span
                          className={`px-2.5 py-1 rounded-badge text-[11px] font-bold ${
                            l.status === 'Approved'
                              ? 'bg-success/10 text-success'
                              : l.status === 'Pending'
                              ? 'bg-gray-100 text-textSecondary'
                              : l.status === 'Rejected'
                              ? 'bg-danger/10 text-danger'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-right">
                        {(l.status === 'Pending' || l.status === 'Approved') && (
                          <button
                            onClick={() => handleCancelLeave(l._id)}
                            className="text-[12px] font-semibold text-danger hover:text-red-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: APPLY TIME OFF */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-sidebar/40 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
            <div className="bg-surface w-full max-w-[480px] rounded-card border border-borderColor shadow-2xl overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-borderColor flex justify-between items-center bg-background">
                <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Apply for Leave</h3>
                <button onClick={() => setShowApplyModal(false)} className="text-textSecondary hover:text-textPrimary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleApply} className="p-6 space-y-4 text-left">
                {formError && (
                  <div className="flex gap-2 p-3 rounded-button bg-red-50 border border-red-200 text-danger text-[12px] font-medium">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Leave Category</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full h-10 px-3 border border-borderColor rounded-input text-xs text-textPrimary bg-surface/80 placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  >
                    <option value="Casual">Casual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Earned">Earned Leave</option>
                    <option value="Unpaid">Unpaid (Loss of Pay)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs text-textPrimary bg-surface/80 placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs text-textPrimary bg-surface/80 placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Reason</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Provide details about your request..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 border border-borderColor rounded-input text-xs text-textPrimary bg-surface/80 placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-borderColor">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="h-10 px-4 border border-borderColor hover:bg-background text-textPrimary text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-6 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default LeaveManager;
