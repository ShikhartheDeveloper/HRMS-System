import React, { useState, useEffect, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import {
  FileText, FolderOpen, UploadCloud, Search, Eye, Download, Trash2,
  X, AlertCircle, CheckCircle, File, Image as ImageIcon, Loader2
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'tax_form', label: 'Tax Form' },
  { value: 'policy', label: 'Company Policy' },
  { value: 'other', label: 'Other' }
];

const CATEGORY_LABELS = {
  profile_image: 'Profile Image',
  id_proof: 'ID Proof',
  offer_letter: 'Offer Letter',
  tax_form: 'Tax Form',
  policy: 'Policy',
  other: 'Other'
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Documents = () => {
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Employee selector for managers/HR
  const [employees, setEmployees] = useState([]);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');

  const isManagerOrAdmin = ['MANAGER', 'HR_ADMIN', 'LEADERSHIP'].includes(user?.role);
  const selfEmployeeId = user?.employee?._id;

  // Fetch documents for the current user's employee
  useEffect(() => {
    if (selfEmployeeId) {
      fetchDocuments();
    }
  }, [selfEmployeeId, activeTab]);

  // Fetch employee list for managers/admins
  useEffect(() => {
    if (isManagerOrAdmin) {
      fetchEmployees();
    }
  }, [isManagerOrAdmin]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = activeTab !== 'all' ? `?category=${activeTab}` : '';
      const res = await api.get(`/uploads/documents/${selfEmployeeId}${params}`);
      if (res.data.success) {
        setDocuments(res.data.data.filter(d => d.category !== 'profile_image'));
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees', { params: { limit: 100 } });
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const handleOpenUpload = () => {
    setSelectedFile(null);
    setUploadCategory('other');
    setTargetEmployeeId(selfEmployeeId || '');
    setFormError('');
    setShowUploadModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFormError('File must be under 10MB');
        return;
      }
      setSelectedFile(file);
      setFormError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFormError('File must be under 10MB');
        return;
      }
      setSelectedFile(file);
      setFormError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return setFormError('Please select a file');
    if (!targetEmployeeId) return setFormError('Please select an employee');

    setUploading(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('category', uploadCategory);

      const res = await api.post(
        `/uploads/documents/${targetEmployeeId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (res.data.success) {
        setShowUploadModal(false);
        setFeedback('Document uploaded successfully!');
        setTimeout(() => setFeedback(''), 4000);
        // Refresh documents if uploaded for self
        if (targetEmployeeId === selfEmployeeId) {
          fetchDocuments();
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleView = (signedUrl) => {
    window.open(signedUrl, '_blank');
  };

  const handleDownload = async (doc) => {
    try {
      // Fetch the document via pre-signed URL and trigger download
      const link = document.createElement('a');
      link.href = doc.signedUrl;
      link.download = doc.originalName;
      link.target = '_blank';
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await api.delete(`/uploads/documents/${docId}`);
      if (res.data.success) {
        setFeedback('Document deleted successfully');
        setTimeout(() => setFeedback(''), 3000);
        fetchDocuments();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete document');
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-primary/70" />;
    return <FileText className="h-5 w-5 text-primary/70" />;
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-textMain">Documents Center</h1>
            <p className="text-sm text-textSub font-medium mt-1">
              {isManagerOrAdmin
                ? 'Upload and manage documents for yourself and your team'
                : 'Access company policies and manage your personal documents'}
            </p>
          </div>

          <button
            onClick={handleOpenUpload}
            className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-all duration-150"
          >
            <UploadCloud className="h-4.5 w-4.5" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className="flex gap-2 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderSoft pb-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All Documents' },
              { key: 'id_proof', label: 'ID Proofs' },
              { key: 'offer_letter', label: 'Offer Letters' },
              { key: 'tax_form', label: 'Tax Forms' },
              { key: 'policy', label: 'Policies' },
              { key: 'other', label: 'Other' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                  activeTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-textSub hover:text-textMain'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-textSub" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-cardBg border border-borderSoft rounded-lg pl-9 pr-4 py-1.5 text-sm font-medium text-textMain placeholder-textSub focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
            />
          </div>
        </div>

        {/* File Table */}
        <div className="bg-cardBg border border-borderSoft rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-textSub">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-xs font-medium">Loading documents...</p>
            </div>
          ) : filteredDocs.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-borderSoft text-[11px] font-bold text-textSub uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">File Size</th>
                  <th className="px-6 py-3.5">Uploaded</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSoft text-sm">
                {filteredDocs.map((doc) => (
                  <tr key={doc._id} className="hover:bg-background/40 transition-all duration-150">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {getFileIcon(doc.mimeType)}
                      <div className="flex flex-col">
                        <span className="font-semibold text-textMain truncate max-w-[250px]">{doc.originalName}</span>
                        <span className="text-[10px] text-textSub">{doc.mimeType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-primary/5 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                        {CATEGORY_LABELS[doc.category] || doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-textSub font-medium">{formatFileSize(doc.fileSize)}</td>
                    <td className="px-6 py-4 text-textSub font-medium">
                      <div className="flex flex-col">
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        <span className="text-[10px] text-textSub">by {doc.uploadedBy?.email || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleView(doc.signedUrl)}
                          className="p-1.5 hover:bg-background rounded text-textSub hover:text-textMain transition-all duration-150"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 hover:bg-background rounded text-textSub hover:text-textMain transition-all duration-150"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc._id)}
                          className="p-1.5 hover:bg-red-50 rounded text-textSub hover:text-red-500 transition-all duration-150"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <FolderOpen className="h-10 w-10 text-textSub mb-3" />
              <h3 className="font-bold text-textMain">No documents found</h3>
              <p className="text-xs text-textSub font-medium mt-1">
                {searchTerm ? 'Try resetting your search term' : 'Upload your first document using the button above'}
              </p>
            </div>
          )}
        </div>

        {/* UPLOAD MODAL */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
            <div className="bg-cardBg w-full max-w-[520px] rounded-xl border border-borderSoft shadow-2xl overflow-hidden animate-fade-in">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-borderSoft flex justify-between items-center bg-background">
                <h3 className="font-bold text-sm text-textMain uppercase tracking-wider">Upload Document</h3>
                <button onClick={() => setShowUploadModal(false)} className="text-textSub hover:text-textMain">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="p-6 space-y-5 text-left">
                {formError && (
                  <div className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[12px] font-medium">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Employee Selector (for managers/admins) */}
                {isManagerOrAdmin && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-textSub uppercase tracking-wider">Upload For</label>
                    <select
                      value={targetEmployeeId}
                      onChange={(e) => setTargetEmployeeId(e.target.value)}
                      className="w-full h-10 px-3 border border-borderSoft rounded-lg text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-cardBg text-textMain"
                    >
                      <option value="">Select an employee...</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} — {emp.employeeId}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-textSub uppercase tracking-wider">Document Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full h-10 px-3 border border-borderSoft rounded-lg text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-cardBg text-textMain"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Drag-and-Drop File Zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
                    selectedFile
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-borderSoft hover:border-primary/30 hover:bg-primary/5'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <File className="h-8 w-8 text-primary" />
                      <p className="text-sm font-semibold text-textMain">{selectedFile.name}</p>
                      <p className="text-[11px] text-textSub">{formatFileSize(selectedFile.size)}</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        className="text-[11px] text-red-500 font-semibold hover:underline mt-1"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className="h-8 w-8 text-textSub" />
                      <p className="text-sm font-semibold text-textMain">Drag & drop or click to select</p>
                      <p className="text-[11px] text-textSub">PDF, DOC, DOCX, JPG, PNG, WebP — max 10MB</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 flex justify-end gap-3 border-t border-borderSoft">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="h-10 px-4 border border-borderSoft hover:bg-background text-textMain text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="h-10 px-6 bg-primary hover:bg-primaryHover text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3.5 w-3.5" />
                        Upload
                      </>
                    )}
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

export default Documents;
