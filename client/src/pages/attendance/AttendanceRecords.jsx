import React, { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import {
  Clock,
  Calendar,
  AlertTriangle,
  UserCheck,
  CheckCircle,
  HelpCircle,
  X,
  Compass
} from 'lucide-react';

const AttendanceRecords = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'team'
  const [myRecords, setMyRecords] = useState([]);
  const [teamRecords, setTeamRecords] = useState([]);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Regularization Modal States
  const [showRegModal, setShowRegModal] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regReason, setRegReason] = useState('');
  const [regInTime, setRegInTime] = useState('09:00');
  const [regOutTime, setRegOutTime] = useState('18:00');
  const [formError, setFormError] = useState('');

  const fetchMyAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/my-records');
      if (res.data.success) {
        setMyRecords(res.data.data);

        // Check if punched in today
        if (res.data.data.length > 0) {
          const first = res.data.data[0];
          const logDate = new Date(first.date).toDateString();
          const todayDate = new Date().toDateString();

          if (logDate === todayDate) {
            setCurrentRecord(first);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAttendance = async () => {
    try {
      const res = await api.get('/attendance/team-records');
      if (res.data.success) {
        setTeamRecords(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
    if (['MANAGER', 'HR_ADMIN', 'LEADERSHIP'].includes(user?.role)) {
      fetchTeamAttendance();
    }
  }, [user]);

  const handlePunch = async (type) => {
    setLoading(true);
    try {
      const gps = { latitude: 12.9716, longitude: 77.5946 }; // Mock Location
      const res = await api.post(`/attendance/punch-${type}`, { gps });
      if (res.data.success) {
        fetchMyAttendance();
        setFeedback(`Clock-${type} logged successfully!`);
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Clock action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReg = (targetDate = '') => {
    setRegDate(targetDate ? new Date(targetDate).toISOString().split('T')[0] : '');
    setRegReason('');
    setRegInTime('09:00');
    setRegOutTime('18:00');
    setFormError('');
    setShowRegModal(true);
  };

  const handleApplyRegularization = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const punchInFull = new Date(`${regDate}T${regInTime}:00`);
      const punchOutFull = new Date(`${regDate}T${regOutTime}:00`);

      const res = await api.post('/attendance/regularization', {
        date: regDate,
        reason: regReason,
        requestedPunchIn: punchInFull,
        requestedPunchOut: punchOutFull
      });

      if (res.data.success) {
        setShowRegModal(false);
        fetchMyAttendance();
        setFeedback('Regularization request submitted!');
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to submit regularization');
    }
  };

  const handleReviewReg = async (id, status) => {
    try {
      const res = await api.put(`/attendance/regularization/${id}/approve`, {
        status,
        comments: 'Reviewed from attendance roster'
      });
      if (res.data.success) {
        fetchTeamAttendance();
        setFeedback(`Regularization request ${status.toLowerCase()}!`);
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Action failed');
    }
  };

  return (
    <PageWrapper title="Attendance Muster">
      <div className="space-y-6 text-left animate-fade-in">
        {feedback && (
          <div className="flex gap-2 p-3.5 rounded-button bg-success/10 border border-success/30 text-success text-xs font-semibold">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Clock Controls Card */}
        <div className="bg-surface p-6 rounded-card border border-borderColor shadow-custom flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div className="space-y-0.5 text-left">
              <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Punch Card</h3>
              <p className="text-xs text-textSecondary flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-textSecondary" />
                Office geofencing active (Bangalore HQ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-textSecondary font-semibold uppercase">Today's Status</span>
              <span className="text-sm font-bold text-textPrimary">
                {currentRecord?.punchIn
                  ? `Punched In at ${new Date(currentRecord.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Not Punched In'}
              </span>
            </div>

            <div className="flex gap-3">
              {!currentRecord?.punchIn && (
                <button
                  onClick={() => handlePunch('in')}
                  disabled={loading}
                  className="h-10 px-5 bg-primary hover:bg-primary-hover text-white rounded-button text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  Clock In
                </button>
              )}
              {currentRecord?.punchIn && !currentRecord?.punchOut && (
                <button
                  onClick={() => handlePunch('out')}
                  disabled={loading}
                  className="h-10 px-5 bg-danger hover:bg-red-600 text-white rounded-button text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  Clock Out
                </button>
              )}
              {currentRecord?.punchOut && (
                <span className="px-4 py-2 bg-success/15 text-success rounded-button text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5" />
                  Clock Completed
                </span>
              )}

              <button
                onClick={() => handleOpenReg()}
                className="h-10 px-4 border border-borderColor hover:bg-background text-textPrimary rounded-button text-xs font-semibold cursor-pointer transition-colors"
              >
                Apply Regularization
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        {['MANAGER', 'HR_ADMIN', 'LEADERSHIP'].includes(user?.role) && (
          <div className="border-b border-borderColor flex gap-6">
            <button
              onClick={() => setActiveTab('personal')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === 'personal' ? 'border-b-2 border-primary text-textPrimary' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              My Attendance
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === 'team' ? 'border-b-2 border-primary text-textPrimary' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Team Attendance
            </button>
          </div>
        )}

        {/* Attendance Log Table */}
        {activeTab === 'personal' ? (
          <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-borderColor">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Clock In</th>
                    <th className="px-6 py-4">Clock Out</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Regularization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor/60 text-[13px]">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-textSecondary text-xs">Loading logs...</td>
                    </tr>
                  ) : myRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-textSecondary text-xs">No records logged.</td>
                    </tr>
                  ) : (
                    myRecords.map((r) => (
                      <tr key={r._id} className="hover:bg-background/40 transition-colors h-14">
                        <td className="px-6 py-2 font-semibold text-textPrimary">
                          {new Date(r.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-2 text-textSecondary">
                          {r.punchIn ? new Date(r.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                        </td>
                        <td className="px-6 py-2 text-textSecondary">
                          {r.punchOut ? (
                            <div className="flex flex-col text-left">
                              <span>{new Date(r.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {r.isEarlyOut && (
                                <span className="text-[10px] text-danger font-semibold uppercase tracking-wider mt-0.5">Before Time</span>
                              )}
                            </div>
                          ) : '--'}
                        </td>
                        <td className="px-6 py-2">
                          <span
                            className={`px-2.5 py-1 rounded-badge text-[11px] font-bold ${
                              r.status === 'Present'
                                ? 'bg-success/10 text-success'
                                : r.status === 'Late'
                                ? 'bg-warning/10 text-warning'
                                : r.status === 'On Leave'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-danger/10 text-danger'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-right">
                          {r.regularization && r.regularization.status !== 'None' ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                r.regularization.status === 'Pending'
                                  ? 'bg-gray-100 text-textSecondary'
                                  : r.regularization.status === 'Approved'
                                  ? 'bg-success/10 text-success'
                                  : 'bg-danger/10 text-danger'
                              }`}
                            >
                              Reg: {r.regularization.status}
                            </span>
                          ) : (
                            r.status === 'Absent' && (
                              <button
                                onClick={() => handleOpenReg(r.date)}
                                className="text-[12px] font-semibold text-primary hover:text-primary-hover cursor-pointer"
                              >
                                Regularize
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-borderColor">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Punches</th>
                    <th className="px-6 py-4">Regularization Request</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor/60 text-[13px]">
                  {teamRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-textSecondary text-xs">No team records found.</td>
                    </tr>
                  ) : (
                    teamRecords.map((r) => (
                      <tr key={r._id} className="hover:bg-background/40 transition-colors h-14">
                        <td className="px-6 py-2 font-semibold text-textPrimary">
                          {r.employeeId ? `${r.employeeId.firstName} ${r.employeeId.lastName}` : 'Employee'}
                        </td>
                        <td className="px-6 py-2 text-textSecondary">
                          {new Date(r.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-2 text-textSecondary">
                          <div>
                            In: {r.punchIn ? new Date(r.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            Out: {r.punchOut ? new Date(r.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                            {r.isEarlyOut && (
                              <span className="px-1.5 py-0.5 bg-danger/10 text-danger rounded text-[9px] font-bold uppercase tracking-wider">Before Time</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-2">
                          {r.regularization?.status === 'Pending' ? (
                            <div className="flex flex-col text-left">
                              <span className="text-[11px] font-semibold text-textPrimary">Reason: {r.regularization.reason}</span>
                              <span className="text-[10px] text-textSecondary">
                                Requested: {r.regularization.requestedPunchIn ? new Date(r.regularization.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'} - {r.regularization.requestedPunchOut ? new Date(r.regularization.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-textSecondary">{r.regularization?.status || 'None'}</span>
                          )}
                        </td>
                        <td className="px-6 py-2 text-right">
                          {r.regularization?.status === 'Pending' && (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleReviewReg(r._id, 'Approved')}
                                className="h-7 px-2.5 bg-success hover:bg-success/90 text-white rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewReg(r._id, 'Rejected')}
                                className="h-7 px-2.5 border border-danger text-danger hover:bg-danger/5 rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: APPLY REGULARIZATION */}
        {showRegModal && (
          <div className="fixed inset-0 bg-sidebar/40 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
            <div className="bg-surface w-full max-w-[480px] rounded-card border border-borderColor shadow-2xl overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-borderColor flex justify-between items-center bg-background">
                <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Apply Regularization</h3>
                <button onClick={() => setShowRegModal(false)} className="text-textSecondary hover:text-textPrimary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleApplyRegularization} className="p-6 space-y-4 text-left">
                {formError && (
                  <div className="flex gap-2 p-3 rounded-button bg-red-50 border border-red-200 text-danger text-[12px] font-medium">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Date to Regularize</label>
                  <input
                    type="date"
                    required
                    value={regDate}
                    onChange={(e) => setRegDate(e.target.value)}
                    className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Requested Punch In</label>
                    <input
                      type="time"
                      required
                      value={regInTime}
                      onChange={(e) => setRegInTime(e.target.value)}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Requested Punch Out</label>
                    <input
                      type="time"
                      required
                      value={regOutTime}
                      onChange={(e) => setRegOutTime(e.target.value)}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Reason for Request</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="e.g. Forgot to clock out, client visit, network issue..."
                    value={regReason}
                    onChange={(e) => setRegReason(e.target.value)}
                    className="w-full p-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-borderColor">
                  <button
                    type="button"
                    onClick={() => setShowRegModal(false)}
                    className="h-10 px-4 border border-borderColor hover:bg-background text-textPrimary text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-6 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Submit Request
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

export default AttendanceRecords;
