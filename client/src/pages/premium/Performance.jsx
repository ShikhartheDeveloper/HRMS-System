import React, { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { Target, Award, Star, MessageSquare, Plus } from 'lucide-react';

const canManageOthers = (role) => ['HR_ADMIN', 'LEADERSHIP', 'MANAGER'].includes(role);

const Performance = () => {
  const { user } = useAuthStore();
  const [performances, setPerformances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Goal modal/form states
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [targetEmp, setTargetEmp] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCycle, setGoalCycle] = useState('Q2 2026');
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // Review modal/form states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewEmp, setReviewEmp] = useState('');
  const [reviewCycle, setReviewCycle] = useState('Q2 2026');
  const [reviewerRole, setReviewerRole] = useState('Peer');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const perfRes = await api.get('/premium/performance');
      if (perfRes.data.success) {
        setPerformances(perfRes.data.data);
      }

      if (canManageOthers(user.role)) {
        const empRes = await api.get('/employees', { params: { limit: 500 } });
        if (empRes.data.success) {
          const list = empRes.data.data || [];
          setEmployees(list);
          if (list.length > 0) {
            setTargetEmp(list[0]._id);
            setReviewEmp(list[0]._id);
          }
        }
      } else if (user.employee?._id) {
        setTargetEmp(user.employee._id);
        setReviewEmp(user.employee._id);
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const goalRecords = performances.filter((perf) => perf.goals?.length > 0);
  const reviewRecords = performances.filter((perf) => perf.reviews?.length > 0);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmittingGoal(true);

    const employeeId = canManageOthers(user.role)
      ? targetEmp
      : (user.employee?._id || user.employeeId);

    if (!employeeId) {
      setFormError('No employee selected');
      setSubmittingGoal(false);
      return;
    }

    try {
      const res = await api.post('/premium/performance/goal', {
        employeeId,
        title: goalTitle,
        target: goalTarget,
        cycle: goalCycle
      });
      if (res.data.success) {
        setShowGoalModal(false);
        setGoalTitle('');
        setGoalTarget('');
        setFormSuccess(res.data.message || 'Goal added successfully');
        setTimeout(() => setFormSuccess(''), 4000);
        fetchData();
      }
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to add goal');
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmittingReview(true);

    const employeeId = canManageOthers(user.role)
      ? reviewEmp
      : (user.employee?._id || user.employeeId);

    if (!employeeId) {
      setFormError('No employee selected');
      setSubmittingReview(false);
      return;
    }

    try {
      const res = await api.post('/premium/performance/review', {
        employeeId,
        cycle: reviewCycle,
        reviewerRole,
        rating: Number(reviewRating),
        feedback: reviewFeedback
      });
      if (res.data.success) {
        setShowReviewModal(false);
        setReviewFeedback('');
        setFormSuccess(res.data.message || 'Review submitted successfully');
        setTimeout(() => setFormSuccess(''), 4000);
        fetchData();
      }
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <PageWrapper title="Performance & Goals">
      <div className="space-y-6 animate-fade-in text-textPrimary">
        {formSuccess && (
          <div className="p-3 rounded-button bg-success/10 border border-success/20 text-success text-[12px] font-medium">
            {formSuccess}
          </div>
        )}
        {formError && !showGoalModal && !showReviewModal && (
          <div className="p-3 rounded-button bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-danger text-[12px] font-medium">
            {formError}
          </div>
        )}

        {/* Top Actions */}
        <div className="flex justify-between items-center bg-surface border border-borderColor rounded-card p-6 shadow-card flex-wrap gap-4">
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wider">Workforce Evaluation & OKR</h2>
            <p className="text-[12px] text-textSecondary mt-0.5">Define objectives, key results, and gather 360-degree feedback reviews</p>
          </div>
          <div className="flex gap-3">
            {canManageOthers(user.role) && (
              <button
                onClick={() => { setFormError(''); setShowGoalModal(true); }}
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150"
              >
                <Plus className="h-4 w-4" /> Add Goal / OKR
              </button>
            )}
            <button
              onClick={() => { setFormError(''); setShowReviewModal(true); }}
              className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150"
            >
              <MessageSquare className="h-4 w-4" /> Write Review
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OKRs & Goals */}
          <div className="bg-surface border border-borderColor rounded-card shadow-card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-borderColor pb-3">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-[14px] uppercase tracking-wider">Objectives & Key Results (OKRs)</h3>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {loading ? (
                <p className="text-center py-12 text-textSecondary">Loading goals...</p>
              ) : goalRecords.length === 0 ? (
                <p className="text-center py-12 text-textSecondary">No active goals found.</p>
              ) : (
                goalRecords.map((perf) => (
                  <div key={perf._id} className="border border-borderColor rounded-card p-4 bg-background/30 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[13px] text-primary">
                        {perf.employeeId ? `${perf.employeeId.firstName} ${perf.employeeId.lastName}` : 'Employee'}
                      </span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{perf.cycle}</span>
                    </div>
                    <div className="space-y-3">
                      {perf.goals.map((goal, idx) => (
                        <div key={idx} className="space-y-1 text-[13px]">
                          <div className="flex justify-between">
                            <span className="font-medium text-textPrimary">{goal.title}</span>
                            <span className="text-textSecondary text-[11px] font-semibold">{goal.status}</span>
                          </div>
                          <p className="text-[11px] text-textSecondary">Target: {goal.target}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 360 Feedback & Rating History */}
          <div className="bg-surface border border-borderColor rounded-card shadow-card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-borderColor pb-3">
              <Award className="h-5 w-5 text-accent" />
              <h3 className="font-bold text-[14px] uppercase tracking-wider">360° Review History & Calibration</h3>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {loading ? (
                <p className="text-center py-12 text-textSecondary">Loading reviews...</p>
              ) : reviewRecords.length === 0 ? (
                <p className="text-center py-12 text-textSecondary">No reviews submitted yet.</p>
              ) : (
                reviewRecords.map((perf) => (
                  <div key={perf._id} className="border border-borderColor rounded-card p-4 bg-background/30 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[13px]">
                        {perf.employeeId ? `${perf.employeeId.firstName} ${perf.employeeId.lastName}` : 'Employee'}
                      </span>
                      {perf.finalRating && (
                        <div className="flex items-center gap-1 text-warning bg-warning/10 px-2 py-0.5 rounded-full text-[11px] font-bold">
                          <Star className="h-3.5 w-3.5 fill-current" /> {perf.finalRating.toFixed(1)} / 5.0
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {perf.reviews.map((rev, idx) => (
                        <div key={idx} className="text-[12px] bg-surface border border-borderColor rounded-md p-2.5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-textSecondary uppercase tracking-wider text-[10px]">
                              {rev.reviewerRole} Review
                              {rev.reviewerId ? ` · ${rev.reviewerId.firstName} ${rev.reviewerId.lastName}` : ''}
                            </span>
                            <span className="text-warning font-semibold">★ {rev.rating}</span>
                          </div>
                          <p className="text-textPrimary italic">"{rev.feedback}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Goal Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-textPrimary">Create Goal / OKR</h3>
              <form onSubmit={handleAddGoal} className="space-y-3 text-[13px]">
                {formError && (
                  <div className="p-2.5 rounded-button bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-danger text-[12px]">
                    {formError}
                  </div>
                )}
                {canManageOthers(user.role) && (
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Employee</label>
                    <select
                      required
                      value={targetEmp}
                      onChange={(e) => setTargetEmp(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    >
                      {employees.length === 0 ? (
                        <option value="">No employees found</option>
                      ) : (
                        employees.map((emp) => (
                          <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} — {emp.department}</option>
                        ))
                      )}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Goal / Objective Title</label>
                  <input
                    type="text"
                    required
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="e.g. Redesign API Gateway"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Key Results Target</label>
                  <input
                    type="text"
                    required
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    placeholder="e.g. Reduce latency by 20%"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Evaluation Cycle</label>
                  <input
                    type="text"
                    required
                    value={goalCycle}
                    onChange={(e) => setGoalCycle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowGoalModal(false); setFormError(''); }}
                    disabled={submittingGoal}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingGoal || (canManageOthers(user.role) && !targetEmp)}
                    className="px-4 py-1.5 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover disabled:opacity-50"
                  >
                    {submittingGoal ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-textPrimary">Submit 360 Feedback</h3>
              <form onSubmit={handleAddReview} className="space-y-3 text-[13px]">
                {formError && (
                  <div className="p-2.5 rounded-button bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-danger text-[12px]">
                    {formError}
                  </div>
                )}
                {canManageOthers(user.role) ? (
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Target Employee</label>
                    <select
                      required
                      value={reviewEmp}
                      onChange={(e) => setReviewEmp(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    >
                      {employees.length === 0 ? (
                        <option value="">No employees found</option>
                      ) : (
                        employees.map((emp) => (
                          <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} — {emp.department}</option>
                        ))
                      )}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Target Employee</label>
                    <input
                      type="text"
                      readOnly
                      value={user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'Myself'}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background opacity-80"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Feedback Role</label>
                    <select
                      value={reviewerRole}
                      onChange={(e) => setReviewerRole(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    >
                      <option value="Self">Self</option>
                      <option value="Peer">Peer</option>
                      <option value="Manager">Manager</option>
                      <option value="Direct Report">Direct Report</option>
                      {user.role === 'HR_ADMIN' && <option value="HR Admin">HR Admin</option>}
                      {user.role === 'LEADERSHIP' && <option value="Leadership">Leadership</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Rating (1-5)</label>
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    >
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Very Good</option>
                      <option value="3">3 - Good</option>
                      <option value="2">2 - Needs Improvement</option>
                      <option value="1">1 - Poor</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Evaluation Cycle</label>
                  <input
                    type="text"
                    required
                    value={reviewCycle}
                    onChange={(e) => setReviewCycle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Detailed Review Comments</label>
                  <textarea
                    required
                    rows="3"
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder="Provide constructive feedback, achievements, or training recommendations..."
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none resize-none"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowReviewModal(false); setFormError(''); }}
                    disabled={submittingReview}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview || (canManageOthers(user.role) && !reviewEmp)}
                    className="px-4 py-1.5 bg-accent text-white rounded-button font-semibold hover:bg-accent-hover disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
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

export default Performance;
