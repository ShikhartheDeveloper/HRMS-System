import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Upload,
  AlertCircle,
  X,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Form states
  const [formFields, setFormFields] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Password123',
    phone: '',
    department: '',
    designation: '',
    role: 'EMPLOYEE',
    salary: 0
  });

  const [csvText, setCsvText] = useState('');
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Fetch employees list
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees', {
        params: { page, limit: 10, search, department: deptFilter }
      });
      if (res.data.success) {
        setEmployees(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, search, deptFilter]);

  const handleOpenAdd = () => {
    setFormFields({
      firstName: '',
      lastName: '',
      email: '',
      password: 'Password123',
      phone: '',
      department: '',
      designation: '',
      role: 'EMPLOYEE',
      salary: 0
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (emp) => {
    setSelectedEmp(emp);
    setFormFields({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || '',
      department: emp.department,
      designation: emp.designation,
      role: emp.role || 'EMPLOYEE',
      salary: emp.salary || 0,
      status: emp.status
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await api.post('/employees', formFields);
      if (res.data.success) {
        setShowAddModal(false);
        fetchEmployees();
        const empId = res.data.data?.employeeId;
        setFeedback(`Employee created successfully! Generated ID: ${empId || 'N/A'}`);
        setTimeout(() => setFeedback(''), 5000);
      }
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to create employee');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await api.put(`/employees/${selectedEmp._id}`, formFields);
      if (res.data.success) {
        setShowEditModal(false);
        fetchEmployees();
        setFeedback('Employee updated successfully!');
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to update employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      const res = await api.delete(`/employees/${id}`);
      if (res.data.success) {
        fetchEmployees();
        setFeedback('Employee deleted successfully!');
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Deletion failed');
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      // Parse CSV text: firstName,lastName,email,department,designation,role,salary,phone
      const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length <= 1) {
        return setFormError('CSV must contain a header row and at least one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const employeesToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const empObj = {};
        headers.forEach((header, index) => {
          empObj[header] = values[index] || '';
        });
        employeesToImport.push(empObj);
      }

      const res = await api.post('/employees/bulk-import', { employees: employeesToImport });
      if (res.data.success) {
        setShowImportModal(false);
        setCsvText('');
        fetchEmployees();
        setFeedback(res.data.message);
        setTimeout(() => setFeedback(''), 4000);
      }
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to import CSV lines');
    }
  };

  return (
    <PageWrapper title="Employee Directory">
      <div className="space-y-6 text-left animate-fade-in">
        {/* Header feedback banner */}
        {feedback && (
          <div className="flex gap-2 p-3.5 rounded-button bg-success/10 border border-success/30 text-success text-xs font-semibold">
            <CheckCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Filters and Actions Row */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-surface p-4 rounded-card border border-borderColor shadow-custom">
          {/* Filters */}
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-textSecondary" />
              <input
                type="text"
                placeholder="Search name, ID, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary bg-background"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary bg-background"
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Marketing">Marketing</option>
              <option value="Product">Product</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="h-10 px-4 border border-borderColor hover:bg-background text-textPrimary rounded-button text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="h-4 w-4 text-textSecondary" />
              Bulk Import
            </button>
            <button
              onClick={handleOpenAdd}
              className="h-10 px-4 bg-primary hover:bg-primary-hover text-white rounded-button text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="bg-surface rounded-card border border-borderColor shadow-custom overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-borderColor">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Department & Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor/60">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-textSecondary text-xs">
                      Loading employee list...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-textSecondary text-xs">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => {
                    const initials = `${emp.firstName[0] || ''}${emp.lastName[0] || ''}`.toUpperCase();
                    return (
                      <tr key={emp._id} className="hover:bg-background/40 transition-colors h-14 text-[13px]">
                        {/* Stacked Avatar + Name + ID */}
                        <td className="px-6 py-2 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs overflow-hidden">
                            {emp.profileImageUrl ? (
                              <img
                                src={emp.profileImageUrl}
                                alt={`${emp.firstName} ${emp.lastName}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-textPrimary">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-[10px] text-textSecondary font-semibold">
                              {emp.employeeId}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-2 text-textSecondary">{emp.email}</td>
                        <td className="px-6 py-2 text-left">
                          <div className="flex flex-col">
                            <span className="font-medium text-textPrimary">{emp.designation}</span>
                            <span className="text-[10px] text-textSecondary font-semibold">{emp.department} • {emp.role}</span>
                          </div>
                        </td>
                        <td className="px-6 py-2">
                          <span
                            className={`px-2.5 py-1 rounded-badge text-[11px] font-bold ${
                              emp.status === 'Active'
                                ? 'bg-success/10 text-success'
                                : emp.status === 'Terminated'
                                ? 'bg-danger/10 text-danger'
                                : emp.status === 'On Leave'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 hover:bg-background rounded text-textSecondary hover:text-textPrimary cursor-pointer transition-colors"
                              title="Edit Employee"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(emp._id)}
                              className="p-1.5 hover:bg-red-50 rounded text-textSecondary hover:text-danger cursor-pointer transition-colors"
                              title="Delete Employee"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-borderColor flex justify-between items-center bg-background/50">
              <span className="text-xs text-textSecondary font-medium">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="h-8 px-3 border border-borderColor rounded-button text-xs font-semibold bg-surface hover:bg-background disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-8 px-3 border border-borderColor rounded-button text-xs font-semibold bg-surface hover:bg-background disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: ADD EMPLOYEE */}
        {showAddModal && (
          <div className="fixed inset-0 bg-sidebar/40 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
            <div className="bg-surface w-full max-w-[560px] rounded-card border border-borderColor shadow-2xl overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-borderColor flex justify-between items-center bg-background">
                <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Add New Employee</h3>
                <button onClick={() => setShowAddModal(false)} className="text-textSecondary hover:text-textPrimary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4 text-left">
                {formError && (
                  <div className="flex gap-2 p-3 rounded-button bg-red-50 border border-red-200 text-danger text-[12px] font-medium">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">First Name</label>
                    <input
                      type="text"
                      required
                      value={formFields.firstName}
                      onChange={(e) => setFormFields({ ...formFields, firstName: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formFields.lastName}
                      onChange={(e) => setFormFields({ ...formFields, lastName: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formFields.email}
                      onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Phone</label>
                    <input
                      type="text"
                      value={formFields.phone}
                      onChange={(e) => setFormFields({ ...formFields, phone: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={formFields.password}
                    onChange={(e) => setFormFields({ ...formFields, password: e.target.value })}
                    className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                  <span className="text-[10px] text-textSecondary">Default: Password123 — employee should change on first login</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Department</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engineering"
                      value={formFields.department}
                      onChange={(e) => setFormFields({ ...formFields, department: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Designation</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Software Engineer"
                      value={formFields.designation}
                      onChange={(e) => setFormFields({ ...formFields, designation: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Role</label>
                    <select
                      value={formFields.role}
                      onChange={(e) => setFormFields({ ...formFields, role: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary bg-transparent"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                      <option value="HR_ADMIN">HR Admin</option>
                      <option value="LEADERSHIP">Leadership</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Annual Salary ($)</label>
                    <input
                      type="number"
                      value={formFields.salary}
                      onChange={(e) => setFormFields({ ...formFields, salary: parseFloat(e.target.value) || 0 })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-borderColor">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="h-10 px-4 border border-borderColor hover:bg-background text-textPrimary text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-6 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Create Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT EMPLOYEE */}
        {showEditModal && (
          <div className="fixed inset-0 bg-sidebar/40 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
            <div className="bg-surface w-full max-w-[560px] rounded-card border border-borderColor shadow-2xl overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-borderColor flex justify-between items-center bg-background">
                <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Edit Employee Profile</h3>
                <button onClick={() => setShowEditModal(false)} className="text-textSecondary hover:text-textPrimary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-6 space-y-4 text-left">
                {formError && (
                  <div className="flex gap-2 p-3 rounded-button bg-red-50 border border-red-200 text-danger text-[12px] font-medium">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">First Name</label>
                    <input
                      type="text"
                      required
                      value={formFields.firstName}
                      onChange={(e) => setFormFields({ ...formFields, firstName: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formFields.lastName}
                      onChange={(e) => setFormFields({ ...formFields, lastName: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Phone</label>
                    <input
                      type="text"
                      value={formFields.phone}
                      onChange={(e) => setFormFields({ ...formFields, phone: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Status</label>
                    <select
                      value={formFields.status}
                      onChange={(e) => setFormFields({ ...formFields, status: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary bg-transparent"
                    >
                      <option value="Active">Active</option>
                      <option value="Terminated">Terminated</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Department</label>
                    <input
                      type="text"
                      required
                      value={formFields.department}
                      onChange={(e) => setFormFields({ ...formFields, department: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Designation</label>
                    <input
                      type="text"
                      required
                      value={formFields.designation}
                      onChange={(e) => setFormFields({ ...formFields, designation: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Role</label>
                    <select
                      value={formFields.role}
                      onChange={(e) => setFormFields({ ...formFields, role: e.target.value })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary bg-transparent"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                      <option value="HR_ADMIN">HR Admin</option>
                      <option value="LEADERSHIP">Leadership</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Annual Salary ($)</label>
                    <input
                      type="number"
                      value={formFields.salary}
                      onChange={(e) => setFormFields({ ...formFields, salary: parseFloat(e.target.value) || 0 })}
                      className="w-full h-10 px-3 border border-borderColor rounded-input text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-borderColor">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="h-10 px-4 border border-borderColor hover:bg-background text-textPrimary text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-6 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: BULK CSV IMPORT */}
        {showImportModal && (
          <div className="fixed inset-0 bg-sidebar/40 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
            <div className="bg-surface w-full max-w-[560px] rounded-card border border-borderColor shadow-2xl overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-borderColor flex justify-between items-center bg-background">
                <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Bulk CSV Copy-Paste</h3>
                <button onClick={() => setShowImportModal(false)} className="text-textSecondary hover:text-textPrimary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleBulkImport} className="p-6 space-y-4 text-left">
                {formError && (
                  <div className="flex gap-2 p-3 rounded-button bg-red-50 border border-red-200 text-danger text-[12px] font-medium">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1 bg-background p-3 rounded-button border border-borderColor">
                  <span className="text-[10px] text-textSecondary font-bold uppercase block mb-1">Required CSV Header Format</span>
                  <code className="text-[11px] block bg-surface p-2 border border-borderColor rounded text-primary select-all">
                    firstName,lastName,email,department,designation,role,salary,phone
                  </code>
                  <span className="text-[10px] text-textSecondary block mt-1">
                    Copy and paste employee lines below with this exact order header as the first line.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">CSV Data Lines</label>
                  <textarea
                    rows="6"
                    placeholder={`firstName,lastName,email,department,designation,role,salary,phone\nJane,Developer,jane@default.com,Engineering,Software Engineer,EMPLOYEE,85000,1234`}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    className="w-full p-3 border border-borderColor rounded-input text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-borderColor">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="h-10 px-4 border border-borderColor hover:bg-background text-textPrimary text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-6 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-button cursor-pointer"
                  >
                    Import Employees
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

export default EmployeeList;
