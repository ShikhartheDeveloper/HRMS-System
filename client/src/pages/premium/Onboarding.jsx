import React, { useState, useEffect, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { Clipboard, ShieldCheck, Folder, Upload, X, ExternalLink } from 'lucide-react';

const isHrOrLeadership = (role) => ['HR_ADMIN', 'LEADERSHIP'].includes(role);

const Onboarding = () => {
  const { user } = useAuthStore();
  const [onboardings, setOnboardings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [docName, setDocName] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [docFile, setDocFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchOnboarding = async () => {
    setLoading(true);
    try {
      const res = await api.get('/premium/onboarding');
      if (res.data.success) {
        setOnboardings(res.data.data);
      }

      if (isHrOrLeadership(user.role)) {
        const empRes = await api.get('/employees', { params: { limit: 500 } });
        if (empRes.data.success) {
          const list = empRes.data.data || [];
          setEmployees(list);
          if (list.length > 0 && !selectedEmployee) {
            setSelectedEmployee(list[0]._id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboarding();
  }, []);

  const handleToggleTask = async (onboardingId, taskId, currentStatus) => {
    try {
      const res = await api.put(`/premium/onboarding/${onboardingId}/task`, {
        taskId,
        completed: !currentStatus
      });
      if (res.data.success) {
        fetchOnboarding();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetUploadForm = () => {
    setDocName('');
    setDocExpiry('');
    setDocFile(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    resetUploadForm();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowed.includes(file.type)) {
      setUploadError('Only PDF, DOC, DOCX, JPEG, PNG, and WebP files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10MB');
      return;
    }

    setUploadError('');
    setDocFile(file);
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setUploadError('Please select a file to upload');
      return;
    }
    if (!selectedEmployee) {
      setUploadError('Please select an employee');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('employeeId', selectedEmployee);
      formData.append('name', docName);
      if (docExpiry) formData.append('expiryDate', docExpiry);
      formData.append('document', docFile);

      const res = await api.post('/premium/onboarding/documents', formData);

      if (res.data.success) {
        closeUploadModal();
        setUploadSuccess(res.data.message || 'Document uploaded successfully');
        setTimeout(() => setUploadSuccess(''), 5000);
        fetchOnboarding();
      }
    } catch (err) {
      setUploadError(err.response?.data?.error?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const allDocuments = onboardings.flatMap((onb) =>
    (onb.documents || []).map((doc) => ({
      ...doc,
      employeeName: onb.employeeId
        ? `${onb.employeeId.firstName} ${onb.employeeId.lastName}`
        : 'Employee'
    }))
  );

  return (
    <PageWrapper title="Onboarding & Policy Sign-offs">
      <div className="space-y-6 animate-fade-in text-textPrimary">
        <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wider">Onboarding Checklists & Compliances</h2>
            <p className="text-[12px] text-textSecondary mt-0.5">Assigned onboarding tasks, policy acceptances, and corporate documents.</p>
          </div>
          {isHrOrLeadership(user.role) && (
            <button
              onClick={() => { setUploadError(''); setShowUploadModal(true); }}
              className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150"
            >
              <Upload className="h-4 w-4" /> Upload Document
            </button>
          )}
        </div>

        {uploadSuccess && (
          <div className="p-3 rounded-button bg-success/10 border border-success/20 text-success text-[12px] font-medium">
            {uploadSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-surface border border-borderColor rounded-card shadow-card p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 border-b border-borderColor pb-3">
              <Clipboard className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-[14px] uppercase tracking-wider">Onboarding Checklist Tasks</h3>
            </div>
            <div className="space-y-4">
              {loading ? (
                <p className="text-center py-12 text-textSecondary">Loading...</p>
              ) : onboardings.length === 0 ? (
                <p className="text-center py-12 text-textSecondary">No onboarding tasks currently assigned.</p>
              ) : (
                onboardings.map((onb) => (
                  <div key={onb._id} className="border border-borderColor rounded-card p-4 bg-background/30 space-y-3">
                    <h4 className="font-semibold text-[13px] text-primary">
                      Onboarding profile for: {onb.employeeId ? `${onb.employeeId.firstName} ${onb.employeeId.lastName}` : 'Employee'}
                    </h4>
                    {onb.tasks?.length === 0 ? (
                      <p className="text-[12px] text-textSecondary">No checklist tasks assigned yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {onb.tasks.map((task) => (
                          <div key={task._id} className="flex items-center justify-between text-[13px] hover:bg-background/50 p-2 rounded-md transition-colors">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => handleToggleTask(onb._id, task._id, task.completed)}
                                className="h-4 w-4 rounded border-borderColor text-primary focus:ring-primary focus:outline-none cursor-pointer"
                              />
                              <span className={task.completed ? 'line-through text-textSecondary' : 'font-medium'}>{task.title}</span>
                            </div>
                            <span className="text-[10px] bg-background text-textSecondary px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                              Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-surface border border-borderColor rounded-card shadow-card p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-borderColor pb-3">
                <ShieldCheck className="h-5 w-5 text-success" />
                <h3 className="font-bold text-[14px] uppercase tracking-wider">Policy Sign-offs</h3>
              </div>
              <div className="space-y-3">
                {(onboardings[0]?.policySignOffs?.length > 0
                  ? onboardings[0].policySignOffs
                  : [
                      { policyName: 'NDA Policy Agreement', signedAt: null },
                      { policyName: 'Information Security Code', signedAt: null }
                    ]
                ).map((policy, idx) => (
                  <div key={idx} className="border border-borderColor rounded-card p-3 bg-background/50 text-[12px] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{policy.policyName}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        policy.signedAt ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        {policy.signedAt ? 'Signed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-textSecondary">
                      {policy.signedAt
                        ? `Signed on ${new Date(policy.signedAt).toLocaleDateString()}`
                        : 'Awaiting employee sign-off.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-borderColor">
              <div className="flex items-center justify-between border-b border-borderColor pb-3">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-accent" />
                  <h3 className="font-bold text-[14px] uppercase tracking-wider">Critical IDs & Expiries</h3>
                </div>
              </div>
              <div className="space-y-2.5 text-[12px]">
                {allDocuments.length === 0 ? (
                  <p className="text-textSecondary text-center py-4">
                    {isHrOrLeadership(user.role)
                      ? 'No documents uploaded yet. Use Upload Document to add files.'
                      : 'No documents uploaded for your profile yet.'}
                  </p>
                ) : (
                  allDocuments.map((doc, idx) => (
                    <div key={doc._id || idx} className="flex justify-between items-center gap-2 bg-background/30 p-2.5 rounded-md border border-borderColor/55">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        {isHrOrLeadership(user.role) && (
                          <p className="text-[10px] text-textSecondary">{doc.employeeName}</p>
                        )}
                        <p className="text-[10px] text-textSecondary truncate">{doc.originalName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-textSecondary text-[10px]">
                          {doc.expiryDate ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}` : 'No expiry'}
                        </span>
                        {doc.signedUrl && (
                          <a
                            href={doc.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-hover flex items-center gap-0.5 text-[10px] font-semibold"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-textPrimary">Upload Onboarding Document</h3>
                <button onClick={closeUploadModal} className="text-textSecondary hover:text-textPrimary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUploadDocument} className="space-y-3 text-[13px]">
                {uploadError && (
                  <div className="p-2.5 rounded-button bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-danger text-[12px]">
                    {uploadError}
                  </div>
                )}
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Employee</label>
                  <select
                    required
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} — {emp.department}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Document Name</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Passport Scan Copy"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Expiry Date (optional)</label>
                  <input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="w-full text-[12px] file:mr-3 file:py-1.5 file:px-3 file:rounded-button file:border-0 file:bg-primary file:text-white file:font-semibold file:cursor-pointer"
                  />
                  {docFile && (
                    <p className="text-[11px] text-textSecondary mt-1">Selected: {docFile.name}</p>
                  )}
                  <p className="text-[10px] text-textSecondary mt-1">PDF, DOC, DOCX, JPEG, PNG, WebP — max 10MB. Stored in S3.</p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeUploadModal}
                    disabled={uploading}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !docFile}
                    className="px-4 py-1.5 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload to S3'}
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

export default Onboarding;
