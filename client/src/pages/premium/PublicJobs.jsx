import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import {
  Briefcase,
  MapPin,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  X,
  FileText,
  Phone,
  Mail,
  User,
  Search,
  Building2
} from 'lucide-react';

const PublicJobs = () => {
  const { subdomain } = useParams();
  const [tenant, setTenant] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Application Modal states
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Image URL resolver helper
  const resolveJobImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('data:') || url.startsWith('http')) return url;
    const apiBase = api.defaults.baseURL || '';
    const host = apiBase.replace(/\/api\/?$/, '');
    return `${host}${url}`;
  };

  useEffect(() => {
    const fetchTenantAndJobs = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Lookup tenant
        const tenantRes = await api.get(`/auth/tenant-lookup?subdomain=${subdomain}`);
        if (tenantRes.data.success) {
          setTenant(tenantRes.data.data);
        }

        // 2. Fetch public jobs
        const jobsRes = await api.get(`/premium/public/recruitment/jobs?subdomain=${subdomain}`);
        if (jobsRes.data.success) {
          setJobs(jobsRes.data.data);
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error?.message || 'Failed to load careers portal. Please check the URL.');
      } finally {
        setLoading(false);
      }
    };

    if (subdomain) {
      fetchTenantAndJobs();
    }
  }, [subdomain]);

  const handleOpenJob = (job) => {
    setSelectedJob(job);
    setShowApplyModal(true);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setFormError('');
    setSuccess(false);
  };

  const handleCloseModal = () => {
    setShowApplyModal(false);
    setSelectedJob(null);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await api.post(`/premium/public/recruitment/candidates?subdomain=${subdomain}`, {
        jobId: selectedJob._id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim()
      });

      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.error?.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get unique list of departments for filter dropdown
  const departments = ['All', ...new Set(jobs.map((job) => job.department))];
  const employmentTypes = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship'];

  // Filter jobs based on search term and filters
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || job.department === selectedDept;
    const matchesType = selectedType === 'All' || job.employmentType === selectedType;
    return matchesSearch && matchesDept && matchesType;
  });

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-textPrimary">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-textSecondary">Loading careers portal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-textPrimary p-6">
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl max-w-md text-center space-y-3 shadow-lg">
          <AlertCircle className="h-10 w-10 text-danger mx-auto" />
          <h2 className="text-sm font-bold uppercase tracking-wide">Portal Error</h2>
          <p className="text-xs text-textSecondary leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  const tenantName = tenant?.name || subdomain;

  return (
    <div className="h-screen w-screen overflow-y-auto bg-background text-textPrimary font-sans flex flex-col">
      {/* Premium Glass Header */}
      <header className="sticky top-0 z-40 w-full glass shadow-sm py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-glow">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[14px] font-bold tracking-wide leading-none">{tenantName}</h1>
            <p className="text-[10px] text-textSecondary font-medium mt-0.5">Careers Hub</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full">
          Open Positions ({jobs.length})
        </span>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 px-6 md:px-12 bg-gradient-to-b from-primary/5 via-accent/5 to-transparent border-b border-borderColor/50">
        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Build the Future with <span className="text-gradient font-black">{tenantName}</span>
          </h2>
          <p className="text-xs md:text-sm text-textSecondary max-w-xl mx-auto leading-relaxed">
            We're searching for passionate, curious, and driven individuals to join our team and contribute to exciting new initiatives.
          </p>
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none animate-float"></div>
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none animate-float" style={{ animationDelay: '-3s' }}></div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 md:px-12 py-10 space-y-8">
        
        {/* Search & Filters */}
        <div className="bg-surface border border-borderColor rounded-card p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-6 relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-textSecondary" />
              <input
                type="text"
                placeholder="Search jobs by title, department, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-borderColor rounded-input bg-background focus:outline-none focus:border-primary/50 text-[13px] transition-all"
              />
            </div>

            {/* Department Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 border border-borderColor rounded-input bg-background focus:outline-none focus:border-primary/50 text-[13px] transition-all"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === 'All' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Type Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-borderColor rounded-input bg-background focus:outline-none focus:border-primary/50 text-[13px] transition-all"
              >
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'All' ? 'All Job Types' : type}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[13px] uppercase tracking-wider text-textSecondary">
              Active Openings ({filteredJobs.length})
            </h3>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-borderColor rounded-card text-textSecondary space-y-2">
              <Briefcase className="h-8 w-8 mx-auto opacity-35" />
              <p className="text-xs font-semibold">No open roles found matching your filters.</p>
              <p className="text-[11px] opacity-75">Check back later or try clearing your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredJobs.map((job) => {
                const imageUrl = resolveJobImageUrl(job.imageUrl);
                return (
                  <div
                    key={job._id}
                    className="group bg-surface border border-borderColor rounded-card overflow-hidden hover:shadow-glow hover:border-primary/50 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {imageUrl && (
                        <div className="h-40 w-full bg-background overflow-hidden relative border-b border-borderColor/40">
                          <img
                            src={imageUrl}
                            alt={job.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-all duration-500"
                            onError={(e) => {
                              e.currentTarget.src = '';
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-[14px] leading-tight group-hover:text-primary transition-colors">
                            {job.title}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10.5px] text-textSecondary font-semibold">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 opacity-70" />
                            {job.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 opacity-70" />
                            {job.location}
                          </span>
                        </div>

                        <p className="text-[12px] text-textSecondary line-clamp-3 leading-relaxed">
                          {job.description || 'No description available for this role.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 mt-auto">
                      <button
                        onClick={() => handleOpenJob(job)}
                        className="w-full py-1.5 bg-background hover:bg-primary border border-borderColor hover:border-primary hover:text-white text-[12px] font-semibold rounded-button flex items-center justify-center gap-1.5 transition-all duration-200"
                      >
                        Apply For This Role <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-borderColor/40 text-center text-[11px] text-textSecondary">
        <p>© {new Date().getFullYear()} {tenantName}. Powered by HRMS System.</p>
      </footer>

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-surface border border-borderColor rounded-card w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-borderColor flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded uppercase tracking-wider">
                  {selectedJob.employmentType || 'Full-time'}
                </span>
                <h3 className="text-base font-bold text-textPrimary mt-1.5">{selectedJob.title}</h3>
                <p className="text-[11px] text-textSecondary mt-0.5">
                  {selectedJob.department} · {selectedJob.location}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-background rounded-full transition-colors text-textSecondary hover:text-textPrimary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!success ? (
                <>
                  {/* Job Details Section */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-textSecondary">Role Overview</h4>
                    <p className="text-[12px] text-textSecondary leading-relaxed whitespace-pre-line bg-background/50 border border-borderColor/30 rounded-xl p-4">
                      {selectedJob.description || 'No description provided.'}
                    </p>
                  </div>

                  <hr className="border-borderColor/40" />

                  {/* Submission Form */}
                  <form onSubmit={handleSubmitApplication} className="space-y-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-textSecondary">Submit Application</h4>
                    
                    {formError && (
                      <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-[11px] font-medium flex gap-2 items-center">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-textSecondary">First Name *</label>
                        <div className="relative flex items-center">
                          <User className="absolute left-3 h-4 w-4 text-textSecondary" />
                          <input
                            type="text"
                            required
                            placeholder="John"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={submitting}
                            className="w-full pl-9 pr-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none focus:border-primary/50 text-[12px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-textSecondary">Last Name *</label>
                        <div className="relative flex items-center">
                          <User className="absolute left-3 h-4 w-4 text-textSecondary" />
                          <input
                            type="text"
                            required
                            placeholder="Doe"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={submitting}
                            className="w-full pl-9 pr-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none focus:border-primary/50 text-[12px]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-textSecondary">Email Address *</label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3 h-4 w-4 text-textSecondary" />
                        <input
                          type="email"
                          required
                          placeholder="johndoe@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={submitting}
                          className="w-full pl-9 pr-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none focus:border-primary/50 text-[12px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-textSecondary">Phone Number (Optional)</label>
                      <div className="relative flex items-center">
                        <Phone className="absolute left-3 h-4 w-4 text-textSecondary" />
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={submitting}
                          className="w-full pl-9 pr-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none focus:border-primary/50 text-[12px]"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2 bg-primary hover:bg-primary-hover text-white text-[12px] font-semibold rounded-button flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Submitting Application...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Submit Application</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="py-10 text-center space-y-4 animate-fade-in">
                  <div className="h-14 w-14 bg-success/10 border border-success/20 rounded-full flex items-center justify-center text-success mx-auto shadow-glow">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold uppercase tracking-wide">Application Submitted!</h4>
                    <p className="text-xs text-textSecondary max-w-sm mx-auto leading-relaxed">
                      Thank you for applying. Your profile details have been logged in our systems. Our HR representative will review your application and reach out shortly.
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-1.5 bg-background hover:bg-surface border border-borderColor rounded-button text-xs font-semibold transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicJobs;
