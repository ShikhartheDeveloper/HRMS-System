import React, { useState, useEffect, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { Briefcase, UserPlus, ClipboardList, Sparkles, ImagePlus, X } from 'lucide-react';

const Recruitment = () => {
  const { user } = useAuthStore();
  const { setNotifications } = useNotificationStore();
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDept, setJobDept] = useState('');
  const [jobLocation, setJobLocation] = useState('Remote');
  const [jobType, setJobType] = useState('Full-time');
  const [jobDesc, setJobDesc] = useState('');
  const [jobImage, setJobImage] = useState(null);
  const [jobImagePreview, setJobImagePreview] = useState('');
  const [jobSubmitting, setJobSubmitting] = useState(false);
  const [jobError, setJobError] = useState('');
  const [jobSuccess, setJobSuccess] = useState('');
  const jobImageInputRef = useRef(null);

  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [candFirst, setCandFirst] = useState('');
  const [candLast, setCandLast] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candJob, setCandJob] = useState('');
  const [viewingJob, setViewingJob] = useState(null);

  const resolveJobImageUrl = (url) => {
    if (!url) return null;
    // Data URIs and full URLs are already resolved
    if (url.startsWith('data:') || url.startsWith('http')) return url;

    const apiBase = api.defaults.baseURL || '';
    const host = apiBase.replace(/\/api\/?$/, '');
    return `${host}${url}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const jobRes = await api.get('/premium/recruitment/jobs');
      if (jobRes.data.success) {
        setJobs(jobRes.data.data);
        if (jobRes.data.data.length > 0) {
          setCandJob(jobRes.data.data[0]._id);
        }
      }
      if (user.role === 'HR_ADMIN' || user.role === 'LEADERSHIP') {
        const candRes = await api.get('/premium/recruitment/candidates');
        if (candRes.data.success) {
          setCandidates(candRes.data.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    return () => {
      if (jobImagePreview) URL.revokeObjectURL(jobImagePreview);
    };
  }, [jobImagePreview]);

  const resetJobForm = () => {
    setJobTitle('');
    setJobDept('');
    setJobLocation('Remote');
    setJobType('Full-time');
    setJobDesc('');
    setJobImage(null);
    if (jobImagePreview) URL.revokeObjectURL(jobImagePreview);
    setJobImagePreview('');
    setJobError('');
    if (jobImageInputRef.current) jobImageInputRef.current.value = '';
  };

  const closeJobModal = () => {
    setShowJobModal(false);
    resetJobForm();
  };

  const handleJobImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setJobError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setJobError('Image must be under 5MB');
      return;
    }

    setJobError('');
    setJobImage(file);
    if (jobImagePreview) URL.revokeObjectURL(jobImagePreview);
    setJobImagePreview(URL.createObjectURL(file));
  };

  const refreshNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!jobImage) {
      setJobError('Please upload a job image');
      return;
    }

    setJobSubmitting(true);
    setJobError('');

    try {
      const formData = new FormData();
      formData.append('title', jobTitle);
      formData.append('department', jobDept);
      formData.append('location', jobLocation);
      formData.append('employmentType', jobType);
      formData.append('description', jobDesc);
      formData.append('image', jobImage);

      const res = await api.post('/premium/recruitment/jobs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        closeJobModal();
        const broadcast = res.data.broadcast;
        const notifyMsg = broadcast
          ? ` Job broadcast: ${broadcast.usersNotified}/${broadcast.totalUsers} in-app notifications, ${broadcast.emailsSent} emails sent.`
          : '';
        setJobSuccess((res.data.message || 'Job posting saved successfully.') + notifyMsg);
        setTimeout(() => setJobSuccess(''), 8000);
        if (res.data.data) {
          setJobs((prev) => [res.data.data, ...prev.filter((j) => j._id !== res.data.data._id)]);
        }
        fetchData();
        await refreshNotifications();
      }
    } catch (err) {
      setJobError(err.response?.data?.error?.message || 'Failed to create job posting');
    } finally {
      setJobSubmitting(false);
    }
  };

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/premium/recruitment/candidates', {
        jobId: candJob,
        firstName: candFirst,
        lastName: candLast,
        email: candEmail
      });
      if (res.data.success) {
        setShowCandidateModal(false);
        setCandFirst('');
        setCandLast('');
        setCandEmail('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateStage = async (id, stage) => {
    try {
      const res = await api.put(`/premium/recruitment/candidates/${id}/stage`, { stage });
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const promoteToEmployee = async (candidate) => {
    try {
      // Send a request to convert candidate to employee profile
      const res = await api.post('/employees', {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone || '0000000000',
        department: candidate.jobId?.department || 'Engineering',
        designation: candidate.jobId?.title || 'Engineer',
        salary: candidate.offerDetails?.salary || 60000,
        joiningDate: candidate.offerDetails?.joiningDate || new Date().toISOString().split('T')[0]
      });
      if (res.data.success) {
        await updateStage(candidate._id, 'Hired');
        alert(`Candidate successfully converted to Employee record!`);
      }
    } catch (err) {
      console.error(err);
      alert('Error converting candidate to employee.');
    }
  };

  const pipelineStages = ['Applied', 'Screening', 'Interviewing', 'Offered', 'Hired'];

  return (
    <PageWrapper title="Recruitment & ATS">
      <div className="space-y-6 animate-fade-in text-textPrimary">
        {/* Actions bar */}
        <div className="flex justify-between items-center bg-surface border border-borderColor rounded-card p-6 shadow-card flex-wrap gap-4">
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wider">Applicant Tracking Console</h2>
            <p className="text-[12px] text-textSecondary mt-0.5">Manage jobs, candidates, schedule interviews, and finalize hiring deals</p>
          </div>
          <div className="flex gap-3">
            {user.role === 'HR_ADMIN' && (
              <>
                <button
                  onClick={() => setShowJobModal(true)}
                  className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150"
                >
                  <Briefcase className="h-4 w-4" /> Post New Job
                </button>
                <button
                  onClick={() => setShowCandidateModal(true)}
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150"
                >
                  <UserPlus className="h-4 w-4" /> Add Applicant
                </button>
              </>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        {user.role === 'HR_ADMIN' || user.role === 'LEADERSHIP' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4 select-none">
            {pipelineStages.map((stage) => {
              const stageCandidates = candidates.filter((c) => c.stage === stage);
              return (
                <div key={stage} className="bg-surface border border-borderColor rounded-card p-4 min-w-[200px] flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center border-b border-borderColor pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-textSecondary">{stage}</span>
                    <span className="text-[11px] bg-background text-textSecondary px-2 py-0.5 rounded-full font-bold">
                      {stageCandidates.length}
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 min-h-[300px]">
                    {stageCandidates.map((cand) => (
                      <div key={cand._id} className="border border-borderColor rounded-card p-3 bg-background/50 hover:shadow-glow hover:border-primary/50 transition-all duration-150 text-[12px] space-y-2">
                        <div>
                          <p className="font-bold text-textPrimary">{cand.firstName} {cand.lastName}</p>
                          <p className="text-[10px] text-textSecondary truncate">{cand.jobId?.title || 'General Application'}</p>
                        </div>

                        {/* Drag Simulation Controls */}
                        <div className="flex justify-between items-center pt-2 border-t border-borderColor/50">
                          {stage === 'Offered' ? (
                            <button
                              onClick={() => promoteToEmployee(cand)}
                              className="px-2 py-0.5 bg-success/15 hover:bg-success/20 text-success rounded text-[9px] font-bold flex items-center gap-0.5"
                            >
                              <Sparkles className="h-3 w-3" /> Hire
                            </button>
                          ) : (
                            <span className="text-[9px] text-textSecondary">Active</span>
                          )}

                          <select
                            value={cand.stage}
                            onChange={(e) => updateStage(cand._id, e.target.value)}
                            className="bg-transparent text-[10px] font-semibold text-primary focus:outline-none border-none cursor-pointer"
                          >
                            {pipelineStages.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface border border-borderColor rounded-card p-8 text-center text-textSecondary font-medium">
            Candidates console is only visible to HR Administrators and Leadership stakeholders.
          </div>
        )}

        {/* Job Postings Directory */}
        <div className="bg-surface border border-borderColor rounded-card shadow-card p-6 space-y-4">
          {jobSuccess && (
            <div className="p-3 rounded-button bg-success/10 border border-success/20 text-success text-[12px] font-medium">
              {jobSuccess}
            </div>
          )}
          <div className="flex items-center gap-2 border-b border-borderColor pb-3">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-[14px] uppercase tracking-wider">Active Job Directory</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {jobs.length === 0 ? (
              <p className="text-textSecondary py-4 col-span-3 text-center">No jobs created yet.</p>
            ) : (
              jobs.map((job) => {
                const imageUrl = resolveJobImageUrl(job.imageUrl);
                return (
                  <div key={job._id} className="border border-borderColor rounded-card overflow-hidden hover:shadow-card transition-all duration-150 space-y-2">
                    {imageUrl && (
                      <div className="h-36 w-full bg-background overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={job.title}
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-[13px]">{job.title}</h4>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-success/15 text-success">{job.status}</span>
                    </div>
                    <p className="text-[11px] text-textSecondary uppercase tracking-wider font-semibold">
                      {job.department} · {job.location} · {job.employmentType || 'Full-time'}
                    </p>
                    <p className="text-[12px] text-textSecondary line-clamp-3">{job.description || 'No description provided.'}</p>
                    {job.createdAt && (
                      <p className="text-[10px] text-textSecondary">
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                        {job.postedByEmployeeId ? ` by ${job.postedByEmployeeId.firstName} ${job.postedByEmployeeId.lastName}` : ''}
                      </p>
                    )}
                    <div className="pt-2">
                      <button
                        onClick={() => setViewingJob(job)}
                        className="w-full py-1 bg-background hover:bg-primary border border-borderColor hover:border-primary hover:text-white text-[11px] font-semibold rounded-button flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* Job Post Modal */}
        {showJobModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-textPrimary">Post New Job Opening</h3>
              <form onSubmit={handleCreateJob} className="space-y-3 text-[13px]">
                {jobError && (
                  <div className="p-2.5 rounded-button bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-danger text-[12px]">
                    {jobError}
                  </div>
                )}
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={jobDept}
                    onChange={(e) => setJobDept(e.target.value)}
                    placeholder="e.g. Engineering"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Location</label>
                    <input
                      type="text"
                      required
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      placeholder="e.g. Remote"
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Employment Type</label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Job Description</label>
                  <textarea
                    rows="3"
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    placeholder="Provide overview, details, skills and qualifications needed..."
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none resize-none"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Job Image</label>
                  <input
                    ref={jobImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleJobImageChange}
                    className="hidden"
                  />
                  {jobImagePreview ? (
                    <div className="relative rounded-input overflow-hidden border border-borderColor">
                      <img src={jobImagePreview} alt="Job preview" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setJobImage(null);
                          if (jobImagePreview) URL.revokeObjectURL(jobImagePreview);
                          setJobImagePreview('');
                          if (jobImageInputRef.current) jobImageInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => jobImageInputRef.current?.click()}
                      className="w-full h-28 border-2 border-dashed border-borderColor rounded-input flex flex-col items-center justify-center gap-1.5 text-textSecondary hover:border-primary hover:text-primary transition-colors"
                    >
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-[12px] font-medium">Upload job banner (JPEG, PNG, WebP — max 5MB)</span>
                    </button>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeJobModal}
                    disabled={jobSubmitting}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={jobSubmitting}
                    className="px-4 py-1.5 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover disabled:opacity-50"
                  >
                    {jobSubmitting ? 'Posting...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Applicant Modal */}
        {showCandidateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4">
              <h3 className="text-base font-bold text-textPrimary">Log Applicant Details</h3>
              <form onSubmit={handleCreateCandidate} className="space-y-3 text-[13px]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={candFirst}
                      onChange={(e) => setCandFirst(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={candLast}
                      onChange={(e) => setCandLast(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Position Applied For</label>
                  <select
                    value={candJob}
                    onChange={(e) => setCandJob(e.target.value)}
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  >
                    {jobs.map(j => (
                      <option key={j._id} value={j._id}>{j.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCandidateModal(false)}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-accent text-white rounded-button font-semibold hover:bg-accent-hover"
                  >
                    Add Candidate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Job Modal */}
        {viewingJob && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-success/15 text-success">{viewingJob.status}</span>
                  <h3 className="text-base font-bold text-textPrimary mt-1.5">{viewingJob.title}</h3>
                  <p className="text-[11px] text-textSecondary uppercase tracking-wider font-semibold mt-0.5">
                    {viewingJob.department} · {viewingJob.location} · {viewingJob.employmentType || 'Full-time'}
                  </p>
                </div>
                <button
                  onClick={() => setViewingJob(null)}
                  className="p-1 hover:bg-background rounded-full transition-colors text-textSecondary hover:text-textPrimary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {resolveJobImageUrl(viewingJob.imageUrl) && (
                <div className="h-40 w-full bg-background overflow-hidden rounded-input border border-borderColor">
                  <img
                    src={resolveJobImageUrl(viewingJob.imageUrl)}
                    alt={viewingJob.title}
                    className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-textSecondary">Job Description</h4>
                <p className="text-[12px] text-textSecondary leading-relaxed whitespace-pre-line bg-background/50 border border-borderColor/30 rounded-xl p-4">
                  {viewingJob.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex justify-between items-center text-[10px] text-textSecondary pt-2 border-t border-borderColor/30">
                <span>Posted: {new Date(viewingJob.createdAt).toLocaleDateString()}</span>
                {viewingJob.postedByEmployeeId && (
                  <span>By: {viewingJob.postedByEmployeeId.firstName} {viewingJob.postedByEmployeeId.lastName}</span>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewingJob(null)}
                  className="px-4 py-1.5 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover text-[12px]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default Recruitment;
