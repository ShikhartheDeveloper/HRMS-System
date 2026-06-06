import React, { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { CreditCard, PlusCircle, PieChart, Sparkles, FileText, CheckCircle, XCircle } from 'lucide-react';

const Expenses = () => {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Travel');
  const [amount, setAmount] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/premium/expenses');
      if (res.data.success) {
        setExpenses(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/premium/expenses', {
        title,
        category,
        amount: Number(amount),
        receiptUrl
      });
      if (res.data.success) {
        setShowClaimModal(false);
        setTitle('');
        setAmount('');
        setReceiptUrl('');
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (id, status) => {
    const comments = prompt(`Reason for ${status.toLowerCase()}:`);
    if (comments === null) return;
    try {
      const res = await api.put(`/premium/expenses/${id}/approve`, { status, comments });
      if (res.data.success) {
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const categoryTotals = expenses.reduce((acc, exp) => {
    if (exp.status === 'Approved') {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    }
    return acc;
  }, {});

  return (
    <PageWrapper title="Expense Claims & Reimbursements">
      <div className="space-y-6 animate-fade-in text-textPrimary">
        {/* Actions header */}
        <div className="flex justify-between items-center bg-surface border border-borderColor rounded-card p-6 shadow-card flex-wrap gap-4">
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wider">Corporate Expense Ledger</h2>
            <p className="text-[12px] text-textSecondary mt-0.5">File claims, upload receipt URLs, and verify multi-stage expense approvals.</p>
          </div>
          <button
            onClick={() => setShowClaimModal(true)}
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150"
          >
            <PlusCircle className="h-4 w-4" /> Submit Expense Claim
          </button>
        </div>

        {/* Analytics Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[12px] text-textSecondary font-medium">Pending Claims Total</span>
              <h3 className="text-xl font-bold mt-0.5">
                ₹{expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center text-success">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[12px] text-textSecondary font-medium">Approved Claims Total</span>
              <h3 className="text-xl font-bold mt-0.5 text-success">
                ₹{expenses.filter(e => e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <PieChart className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[12px] text-textSecondary font-medium">Category Breakdown</span>
              <div className="text-[10px] font-medium text-textSecondary mt-1 flex flex-wrap gap-2">
                {Object.entries(categoryTotals).map(([cat, total]) => (
                  <span key={cat} className="bg-background border border-borderColor px-1.5 py-0.5 rounded">
                    {cat}: ₹{total}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Claims Table */}
        <div className="bg-surface border border-borderColor rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-borderColor">
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-textPrimary">Claims Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-background text-textSecondary border-b border-borderColor">
                <tr>
                  <th className="px-6 py-3 font-semibold">Employee</th>
                  <th className="px-6 py-3 font-semibold">Details</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Receipt</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-textSecondary font-medium">
                      No expense claims submitted yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-background/50 transition-colors duration-150">
                      <td className="px-6 py-4 font-medium">
                        {exp.employeeId ? `${exp.employeeId.firstName} ${exp.employeeId.lastName}` : 'Me'}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-textPrimary">{exp.title}</p>
                          <p className="text-[10px] text-textSecondary">Filed: {new Date(exp.claimDate).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-background border border-borderColor px-2 py-0.5 rounded text-[11px] font-medium">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">₹{exp.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {exp.receiptUrl ? (
                          <a
                            href={exp.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-semibold flex items-center gap-1"
                          >
                            <FileText className="h-4 w-4" /> View
                          </a>
                        ) : (
                          <span className="text-textSecondary">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${
                          exp.status === 'Approved'
                            ? 'bg-success/10 text-success'
                            : exp.status === 'Rejected'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {exp.status === 'Pending' && (user.role === 'HR_ADMIN' || user.role === 'MANAGER') && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleAction(exp._id, 'Approved')}
                              className="p-1 text-success hover:bg-success/10 rounded transition-all"
                              title="Approve Claim"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleAction(exp._id, 'Rejected')}
                              className="p-1 text-danger hover:bg-danger/10 rounded transition-all"
                              title="Reject Claim"
                            >
                              <XCircle className="h-5 w-5" />
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

        {/* Create Claim Modal */}
        {showClaimModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4">
              <h3 className="text-base font-bold text-textPrimary">Submit Expense Claim</h3>
              <form onSubmit={handleCreateClaim} className="space-y-3 text-[13px]">
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Expense Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Travel tickets to office branch"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    >
                      <option value="Travel">Travel</option>
                      <option value="Meals">Meals</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Receipt File URL</label>
                  <input
                    type="text"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="e.g. https://example.com/receipt.pdf"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(false)}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover"
                  >
                    Submit Claim
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

export default Expenses;
