import React, { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import {
  Sparkles,
  Brain,
  Search,
  UserCheck,
  TrendingDown,
  Activity,
  FileSearch,
  History,
  Check,
  X,
  FileText,
  AlertTriangle,
  Send,
  Loader2,
  Calendar,
  Layers
} from 'lucide-react';

const AIAdvisory = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tool states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSummaryEmp, setSelectedSummaryEmp] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [candidateName, setCandidateName] = useState('');

  // Current active result
  const [activeResult, setActiveResult] = useState(null);

  // Selected history log for detail modal/drawer
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchHistory();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees', { params: { limit: 500 } });
      if (res.data.success) {
        setEmployees(res.data.data || []);
        if (res.data.data?.length > 0) {
          setSelectedSummaryEmp(res.data.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/ai/history');
      if (res.data.success) {
        setHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch AI history:', err);
    }
  };

  const showNotification = (msg, type = 'success') => {
    if (type === 'success') {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(''), 4000);
    }
  };

  // Generic executor for API calls
  const runAITool = async (endpoint, method = 'get', body = null) => {
    setLoading(true);
    setError('');
    setActiveResult(null);
    try {
      let res;
      if (method === 'get') {
        res = await api.get(endpoint);
      } else {
        res = await api.post(endpoint, body);
      }
      if (res.data.success) {
        setActiveResult(res.data.data);
        showNotification('AI Analysis generated successfully', 'success');
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data?.error?.message || 'AI request failed. Please check Nemotron API credentials.';
      showNotification(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActionApproval = async (id, status, actionPerformed) => {
    try {
      const res = await api.post(`/ai/${id}/action`, { status, actionPerformed });
      if (res.data.success) {
        const updated = res.data.data;
        showNotification(`AI Recommendation marked as ${status}`, 'success');
        fetchHistory();
        if (activeResult && activeResult._id === id) {
          setActiveResult(updated);
        }
        if (selectedHistoryItem && selectedHistoryItem._id === id) {
          setSelectedHistoryItem(updated);
        }
      }
    } catch (err) {
      showNotification('Action status update failed', 'error');
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('###')) {
        return <h4 key={idx} className="text-[14px] font-bold text-white mt-3 mb-1">{line.replace('###', '').trim()}</h4>;
      }
      if (line.startsWith('##')) {
        return <h3 key={idx} className="text-[15px] font-bold text-primary mt-4 mb-2 border-b border-borderColor pb-1">{line.replace('##', '').trim()}</h3>;
      }
      if (line.startsWith('#')) {
        return <h2 key={idx} className="text-[16px] font-extrabold text-accent mt-5 mb-3">{line.replace('#', '').trim()}</h2>;
      }
      if (line.startsWith('-') || line.startsWith('*')) {
        return (
          <ul key={idx} className="list-disc pl-5 my-1 text-[13px] text-textPrimary">
            <li>{line.substring(1).trim()}</li>
          </ul>
        );
      }
      if (/^\d+\./.test(line)) {
        return (
          <ol key={idx} className="list-decimal pl-5 my-1 text-[13px] text-textPrimary">
            <li>{line.replace(/^\d+\./, '').trim()}</li>
          </ol>
        );
      }
      return line.trim() ? <p key={idx} className="my-1.5 text-[13px] leading-relaxed text-textPrimary">{line}</p> : <div key={idx} className="h-2" />;
    });
  };

  const getConfidenceColor = (score) => {
    if (score >= 85) return 'text-success bg-success/10 border-success/20';
    if (score >= 70) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-danger bg-danger/10 border-danger/20';
  };

  return (
    <PageWrapper title="AI & Analytics Advisory">
      <div className="space-y-6 animate-fade-in text-textPrimary">
        
        {/* Banner Alert */}
        <div className="bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30 rounded-card p-5 shadow-card flex items-start gap-4 backdrop-blur-md">
          <Brain className="h-8 w-8 text-violet-400 shrink-0 animate-pulse mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-[14px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
              HRMS Elite - AI Core <span className="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-bold">NVIDIA Nemotron Layer</span>
            </h3>
            <p className="text-[12px] text-textSecondary leading-relaxed">
              Real-time analytics and predictive advisory layered on top of live employee, performance, and attendance records.
              <span className="font-semibold text-warning ml-1">Note: All outputs are advisory-only and require human confirmation for final action.</span>
            </p>
          </div>
        </div>

        {success && (
          <div className="p-3 rounded-button bg-success/10 border border-success/20 text-success text-[12px] font-medium animate-pulse">
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-button bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-danger text-[12px] font-medium">
            {error}
          </div>
        )}

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Navigation Controls Pane */}
          <div className="lg:col-span-3 bg-surface border border-borderColor rounded-card p-4 shadow-card space-y-2">
            <span className="px-3 text-[10px] font-semibold text-gray-500 tracking-wider uppercase block mb-3">
              AI Tools & Scopes
            </span>
            <ul className="space-y-1">
              {[
                { id: 'search', name: 'Smart Directory Search', icon: Search },
                { id: 'summary', name: 'Employee Summaries', icon: UserCheck },
                { id: 'workforce', name: 'Strategic Workforce', icon: Layers },
                { id: 'attrition', name: 'Attrition & Burnout', icon: TrendingDown },
                { id: 'attendance', name: 'Attendance Anomalies', icon: Activity },
                { id: 'resume', name: 'ATS Resume Screener', icon: FileSearch },
                { id: 'history', name: 'Audit & Approval Logs', icon: History }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => {
                        setActiveTab(tab.id);
                        setActiveResult(null);
                        setError('');
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold rounded-button w-full text-left transition-all duration-150 ${
                        isActive
                          ? 'text-white bg-primary shadow-sm shadow-primary/20'
                          : 'text-textSecondary hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      <span>{tab.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Core Workspace Pane */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Tool Inputs & Actions */}
            <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card space-y-4">
              
              {/* Tab 1: Smart Directory Search */}
              {activeTab === 'search' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-[14px] uppercase tracking-wider text-white">Smart Employee Search</h3>
                    <p className="text-[12px] text-textSecondary mt-0.5">Search active employees and payroll structures using natural language queries.</p>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchQuery.trim()) {
                        runAITool(`/ai/search?q=${encodeURIComponent(searchQuery.trim())}`);
                      }
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-textSecondary" />
                      <input
                        type="text"
                        required
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g. Find all female engineers in department Technology earning above 60000"
                        className="w-full pl-10 pr-4 py-2 border border-borderColor rounded-input bg-background focus:outline-none focus:border-primary text-[13px]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !searchQuery.trim()}
                      className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-button text-[13px] font-semibold flex items-center gap-1.5 shrink-0 transition-all duration-150 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      <span>Analyze</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 2: Employee Summaries */}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-[14px] uppercase tracking-wider text-white">AI Employee Summaries</h3>
                    <p className="text-[12px] text-textSecondary mt-0.5">Generate profile assessments detailing strengths, areas of concern, and performance history.</p>
                  </div>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-textSecondary font-semibold text-[11px] uppercase tracking-wider mb-1">Select Employee</label>
                      <select
                        value={selectedSummaryEmp}
                        onChange={(e) => setSelectedSummaryEmp(e.target.value)}
                        className="w-full px-3 py-2 border border-borderColor rounded-input bg-background focus:outline-none text-[13px]"
                      >
                        {employees.map((emp) => (
                          <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => runAITool(`/ai/summary/${selectedSummaryEmp}`)}
                      disabled={loading || !selectedSummaryEmp}
                      className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-button text-[13px] font-semibold flex items-center gap-1.5 shrink-0 transition-all duration-150 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span>Generate Summary</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Workforce strategic planning */}
              {activeTab === 'workforce' && (
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <div>
                    <h3 className="font-bold text-[14px] uppercase tracking-wider text-white">Workforce strategic planning</h3>
                    <p className="text-[12px] text-textSecondary mt-0.5">Analyze skills gaps, headcount distribution, and succession logs.</p>
                  </div>
                  <button
                    onClick={() => runAITool('/ai/workforce')}
                    disabled={loading}
                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-button text-[13px] font-semibold flex items-center gap-1.5 transition-all duration-150 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                    <span>Run Workforce Analysis</span>
                  </button>
                </div>
              )}

              {/* Tab 4: Attrition prediction */}
              {activeTab === 'attrition' && (
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <div>
                    <h3 className="font-bold text-[14px] uppercase tracking-wider text-white">Attrition & Burnout Predictor</h3>
                    <p className="text-[12px] text-textSecondary mt-0.5">Assess team fatigue signals, flight risks, and retention solutions.</p>
                  </div>
                  <button
                    onClick={() => runAITool('/ai/attrition')}
                    disabled={loading}
                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-button text-[13px] font-semibold flex items-center gap-1.5 transition-all duration-150 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
                    <span>Run Flight Risk Analysis</span>
                  </button>
                </div>
              )}

              {/* Tab 5: Attendance anomalies */}
              {activeTab === 'attendance' && (
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <div>
                    <h3 className="font-bold text-[14px] uppercase tracking-wider text-white">Attendance Anomaly Detection</h3>
                    <p className="text-[12px] text-textSecondary mt-0.5">Scan punch logs to spot irregular shifts and buddy-punch patterns.</p>
                  </div>
                  <button
                    onClick={() => runAITool('/ai/attendance-anomalies')}
                    disabled={loading}
                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-button text-[13px] font-semibold flex items-center gap-1.5 transition-all duration-150 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                    <span>Scan Logs for Anomalies</span>
                  </button>
                </div>
              )}

              {/* Tab 6: ATS Resume Screening */}
              {activeTab === 'resume' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runAITool('/ai/screen-resume', 'post', {
                      candidateName,
                      resumeText,
                      jobDescription
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="font-bold text-[14px] uppercase tracking-wider text-white">ATS Candidate Resume Screening</h3>
                    <p className="text-[12px] text-textSecondary mt-0.5">Screen candidate resumes against role requirements to assess skill fit.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-textSecondary font-semibold text-[11px] uppercase tracking-wider mb-1">Candidate Name</label>
                      <input
                        type="text"
                        required
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="e.g. Shikhar Gupta"
                        className="w-full px-3 py-2 border border-borderColor rounded-input bg-background focus:outline-none text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="block text-textSecondary font-semibold text-[11px] uppercase tracking-wider mb-1">Job Description</label>
                      <textarea
                        required
                        rows={6}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the target job description details here..."
                        className="w-full px-3 py-2 border border-borderColor rounded-input bg-background focus:outline-none text-[13px] resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-textSecondary font-semibold text-[11px] uppercase tracking-wider mb-1">Resume Content</label>
                      <textarea
                        required
                        rows={6}
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste candidate resume or CV text content here..."
                        className="w-full px-3 py-2 border border-borderColor rounded-input bg-background focus:outline-none text-[13px] resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !resumeText.trim() || !jobDescription.trim()}
                      className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-button text-[13px] font-semibold flex items-center gap-1.5 transition-all duration-150 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                      <span>Perform Resume Fit Analysis</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 7: History Log View */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-[14px] uppercase tracking-wider text-white">AI History & Audit Logs</h3>
                    <p className="text-[12px] text-textSecondary mt-0.5">Track previous analyses generated by Nemotron along with their approval actions.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-borderColor text-textSecondary font-bold">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Details</th>
                          <th className="py-2.5 px-3">Confidence</th>
                          <th className="py-2.5 px-3">Approval</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-8 text-textSecondary">No advisory items found in logs.</td>
                          </tr>
                        ) : (
                          history.map((item) => (
                            <tr key={item._id} className="border-b border-borderColor hover:bg-white/5 transition-all">
                              <td className="py-2.5 px-3 text-textSecondary whitespace-nowrap">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 font-semibold capitalize text-white">
                                {item.type}
                              </td>
                              <td className="py-2.5 px-3 truncate max-w-[200px]">
                                {item.type === 'search' && `Query: ${item.inputData?.query}`}
                                {item.type === 'summary' && `Emp Summary ID: ${item.inputData?.employeeId}`}
                                {item.type === 'resume' && `Candidate: ${item.inputData?.candidateName}`}
                                {['workforce', 'attrition', 'attendance'].includes(item.type) && 'Org Report'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] border ${getConfidenceColor(item.confidence)}`}>
                                  {item.confidence}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[11px] font-semibold ${
                                  item.status === 'Approved' ? 'text-success' :
                                  item.status === 'Dismissed' ? 'text-danger' :
                                  item.status === 'Pending' ? 'text-warning font-bold' : 'text-textSecondary'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => setSelectedHistoryItem(item)}
                                  className="text-primary hover:underline font-semibold"
                                >
                                  View Report
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Loading Skeleton */}
            {loading && (
              <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card space-y-4 animate-pulse">
                <div className="flex justify-between items-center pb-2 border-b border-borderColor">
                  <div className="h-5 bg-background rounded w-1/3" />
                  <div className="h-6 bg-background rounded-full w-20" />
                </div>
                <div className="space-y-2.5 pt-2">
                  <div className="h-4 bg-background rounded w-full" />
                  <div className="h-4 bg-background rounded w-5/6" />
                  <div className="h-4 bg-background rounded w-4/5" />
                  <div className="h-4 bg-background rounded w-11/12" />
                </div>
              </div>
            )}

            {/* Active Analysis Results Cards */}
            {activeResult && !loading && (
              <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card space-y-6">
                
                {/* Result Title & Confidence Bar */}
                <div className="flex justify-between items-start border-b border-borderColor pb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="font-extrabold text-[15px] uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-violet-400" />
                      <span>Nemotron Assessment Output</span>
                    </h3>
                    <p className="text-[11px] text-textSecondary mt-0.5">Created at {new Date(activeResult.createdAt).toLocaleTimeString()}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                      <AlertTriangle className="h-3 w-3" /> ADVISORY
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border shrink-0 ${getConfidenceColor(activeResult.confidence)}`}>
                      Confidence: {activeResult.confidence}%
                    </span>
                  </div>
                </div>

                {/* Markdown text display */}
                <div className="bg-background/40 border border-borderColor rounded-card p-5 max-h-[500px] overflow-y-auto pr-2 space-y-1">
                  {renderMarkdown(activeResult.output)}
                </div>

                {/* Advisory Approval Controls */}
                {['Pending'].includes(activeResult.status) && (
                  <div className="bg-gradient-to-r from-background to-surface border border-borderColor rounded-card p-4 flex justify-between items-center flex-wrap gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[12px] font-bold text-white uppercase tracking-wider block">Approval Required</span>
                      <p className="text-[11px] text-textSecondary">Confirm audit logs if action items are executed in your organization.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleActionApproval(activeResult._id, 'Dismissed', 'HR Dismissed Recommendation')}
                        className="px-4 py-1.5 border border-borderColor hover:bg-red-500/10 text-danger hover:text-red-400 rounded-button text-[13px] font-semibold flex items-center gap-1.5 transition-all duration-150"
                      >
                        <X className="h-4 w-4" /> Dismiss Recommendation
                      </button>
                      <button
                        onClick={() => handleActionApproval(activeResult._id, 'Approved', 'HR Confirmed & Handled Advice')}
                        className="px-4 py-1.5 bg-success hover:bg-success-hover text-white rounded-button text-[13px] font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-150"
                      >
                        <Check className="h-4 w-4" /> Approve Action
                      </button>
                    </div>
                  </div>
                )}

                {activeResult.status === 'Approved' && (
                  <div className="p-3 bg-success/15 border border-success/30 text-success rounded-card text-[12px] flex items-center gap-2 font-medium">
                    <Check className="h-4.5 w-4.5 fill-current" />
                    <span>Approved by {activeResult.performedBy?.email || 'HR Admin'} ({activeResult.actionPerformed})</span>
                  </div>
                )}
                {activeResult.status === 'Dismissed' && (
                  <div className="p-3 bg-danger/15 border border-danger/30 text-danger rounded-card text-[12px] flex items-center gap-2 font-medium">
                    <X className="h-4.5 w-4.5" />
                    <span>Dismissed: {activeResult.actionPerformed}</span>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

        {/* Selected History Report Modal Drawer */}
        {selectedHistoryItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4 backdrop-blur-sm">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-3xl shadow-lg space-y-4 max-h-[90vh] overflow-y-auto flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-borderColor pb-3">
                  <div>
                    <span className="text-[10px] bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase">
                      {selectedHistoryItem.type} log
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-1">
                      Advisory Audit Report
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedHistoryItem(null)}
                    className="text-textSecondary hover:text-white p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-[12px] bg-background/50 p-3 rounded-card border border-borderColor">
                  <div className="space-y-0.5">
                    <span className="text-textSecondary block">Date generated</span>
                    <span className="font-semibold text-white">{new Date(selectedHistoryItem.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-textSecondary block">Nemotron Confidence</span>
                    <span className="font-semibold text-white">{selectedHistoryItem.confidence}%</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-textSecondary block">Status state</span>
                    <span className={`font-semibold ${
                      selectedHistoryItem.status === 'Approved' ? 'text-success' :
                      selectedHistoryItem.status === 'Dismissed' ? 'text-danger' :
                      selectedHistoryItem.status === 'Pending' ? 'text-warning font-bold' : 'text-textSecondary'
                    }`}>
                      {selectedHistoryItem.status}
                    </span>
                  </div>
                </div>

                {/* Input Query / Metadata Block */}
                {selectedHistoryItem.inputData && Object.keys(selectedHistoryItem.inputData).length > 0 && (
                  <div className="text-[12px] bg-background/20 p-3 rounded-card border border-borderColor space-y-1">
                    <span className="text-textSecondary font-semibold uppercase tracking-wider block text-[10px]">Log Inputs & Metadata</span>
                    {selectedHistoryItem.type === 'search' && (
                      <p className="text-white"><span className="text-textSecondary font-medium">Search query:</span> "{selectedHistoryItem.inputData.query}"</p>
                    )}
                    {selectedHistoryItem.type === 'summary' && (
                      <p className="text-white"><span className="text-textSecondary font-medium">Employee ID:</span> {selectedHistoryItem.inputData.employeeId}</p>
                    )}
                    {selectedHistoryItem.type === 'resume' && (
                      <div className="space-y-1">
                        <p className="text-white"><span className="text-textSecondary font-medium">Candidate Name:</span> {selectedHistoryItem.inputData.candidateName}</p>
                        <p className="text-textSecondary truncate"><span className="font-medium text-textSecondary">Job description snippet:</span> {selectedHistoryItem.inputData.jobDescriptionSnippet}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-background/40 border border-borderColor rounded-card p-5 max-h-[350px] overflow-y-auto space-y-1 text-left">
                  {renderMarkdown(selectedHistoryItem.output)}
                </div>
              </div>

              {/* Action and Close controls */}
              <div className="border-t border-borderColor pt-4 mt-4 flex justify-between items-center gap-4">
                <div>
                  {selectedHistoryItem.status === 'Approved' && (
                    <span className="text-[12px] text-success font-medium">
                      ✓ Approved: {selectedHistoryItem.actionPerformed}
                    </span>
                  )}
                  {selectedHistoryItem.status === 'Dismissed' && (
                    <span className="text-[12px] text-danger font-medium">
                      ✗ Dismissed: {selectedHistoryItem.actionPerformed}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {selectedHistoryItem.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleActionApproval(selectedHistoryItem._id, 'Dismissed', 'HR Dismissed Recommendation')}
                        className="px-4 py-1.5 border border-borderColor text-danger hover:bg-red-500/10 rounded-button text-[13px] font-semibold flex items-center gap-1.5 transition-all duration-150"
                      >
                        <X className="h-4 w-4" /> Dismiss
                      </button>
                      <button
                        onClick={() => handleActionApproval(selectedHistoryItem._id, 'Approved', 'HR Confirmed & Handled Advice')}
                        className="px-4 py-1.5 bg-success hover:bg-success-hover text-white rounded-button text-[13px] font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-150"
                      >
                        <Check className="h-4 w-4" /> Approve
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedHistoryItem(null)}
                    className="px-4 py-1.5 bg-background hover:bg-white/5 border border-borderColor text-white rounded-button text-[13px] font-semibold transition-all duration-150"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  );
};

export default AIAdvisory;
