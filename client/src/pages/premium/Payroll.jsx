import React, { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import api from '../../services/api';
import { DollarSign, Landmark, RefreshCw, FileText, Download, ShieldAlert } from 'lucide-react';

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.get('/premium/payroll');
      if (res.data.success) {
        setPayrollData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const handleRunPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.post('/premium/payroll/run', { month: selectedMonth });
      if (res.data.success) {
        fetchPayroll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id) => {
    try {
      const res = await api.put(`/premium/payroll/${id}/pay`);
      if (res.data.success) {
        fetchPayroll();
        if (selectedPayslip && selectedPayslip._id === id) {
          setSelectedPayslip(res.data.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportBankFile = () => {
    // Generate CSV for bank export
    const headers = 'Employee Name,Account Number,IFSC Code,Net Salary,Month\n';
    const rows = payrollData
      .filter(item => item.month === selectedMonth)
      .map(item => {
        const name = item.employeeId ? `${item.employeeId.firstName} ${item.employeeId.lastName}` : 'N/A';
        return `"${name}","${item.accountNumber}","${item.ifscCode}",${item.netSalary},"${item.month}"`;
      })
      .join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `bank_file_${selectedMonth}.csv`);
    a.click();
  };

  const currentMonthRecords = payrollData.filter(r => r.month === selectedMonth);

  return (
    <PageWrapper title="Payroll & Compliance">
      <div className="space-y-6 animate-fade-in text-textPrimary">
        {/* Controls Card */}
        <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wider mb-1">Pay Period</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-borderColor rounded-input bg-background text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={handleRunPayroll}
              disabled={loading}
              className="mt-5 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold rounded-button shadow-sm flex items-center gap-2 transition-all duration-150"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Run Payroll
            </button>
          </div>

          {currentMonthRecords.length > 0 && (
            <button
              onClick={handleExportBankFile}
              className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-[13px] font-semibold rounded-button shadow-sm flex items-center gap-2 transition-all duration-150"
            >
              <Download className="h-4 w-4" />
              Export Bank File
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[12px] text-textSecondary font-medium">Total Pay Run Cost</span>
              <h3 className="text-xl font-bold mt-0.5">
                ₹{currentMonthRecords.reduce((sum, r) => sum + r.netSalary, 0).toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center text-success">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[12px] text-textSecondary font-medium">Statutory Compliance</span>
              <h3 className="text-xl font-bold mt-0.5 text-success">100% Compliant</h3>
            </div>
          </div>
          <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center text-warning">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[12px] text-textSecondary font-medium">Total LOP Days Deducted</span>
              <h3 className="text-xl font-bold mt-0.5">
                {currentMonthRecords.reduce((sum, r) => sum + (r.lopDays || 0), 0)} Days
              </h3>
            </div>
          </div>
        </div>

        {/* Table & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payroll List */}
          <div className="bg-surface border border-borderColor rounded-card shadow-card lg:col-span-2 overflow-hidden">
            <div className="px-6 py-4 border-b border-borderColor">
              <h2 className="text-[14px] font-bold uppercase tracking-wider text-textPrimary">Employees Pay Run Status ({selectedMonth})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-background text-textSecondary border-b border-borderColor">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Employee</th>
                    <th className="px-6 py-3 font-semibold">Base Salary</th>
                    <th className="px-6 py-3 font-semibold">Net Salary</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor">
                  {currentMonthRecords.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-textSecondary font-medium">
                        No pay runs generated for this period. Click 'Run Payroll' to initialize.
                      </td>
                    </tr>
                  ) : (
                    currentMonthRecords.map((item) => (
                      <tr key={item._id} className="hover:bg-background/50 transition-colors duration-150">
                        <td className="px-6 py-4 font-medium">
                          {item.employeeId ? `${item.employeeId.firstName} ${item.employeeId.lastName}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4">₹{item.baseSalary.toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold text-primary">₹{item.netSalary.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${
                            item.status === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedPayslip(item)}
                            className="text-textSecondary hover:text-primary transition-colors"
                            title="View Payslip"
                          >
                            <FileText className="h-4.5 w-4.5 inline" />
                          </button>
                          {item.status === 'Draft' && (
                            <button
                              onClick={() => handlePay(item._id)}
                              className="text-success hover:underline font-semibold"
                            >
                              Mark Paid
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

          {/* Payslip Viewer Modal / Card */}
          <div className="bg-surface border border-borderColor rounded-card shadow-card p-6 space-y-6">
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-textPrimary">Payslip Inspector</h2>
            {selectedPayslip ? (
              <div className="space-y-4 text-[13px] border border-borderColor rounded-card p-4 bg-background/50">
                <div className="flex justify-between items-center border-b border-borderColor pb-2">
                  <span className="font-bold text-primary">HRMS Elite Payslip</span>
                  <span className="text-[11px] text-textSecondary font-semibold uppercase">{selectedPayslip.month}</span>
                </div>
                <div>
                  <label className="text-[11px] text-textSecondary font-semibold uppercase">Employee Details</label>
                  <p className="font-bold">{selectedPayslip.employeeId ? `${selectedPayslip.employeeId.firstName} ${selectedPayslip.employeeId.lastName}` : 'N/A'}</p>
                  <p className="text-[11px] text-textSecondary">{selectedPayslip.employeeId?.email}</p>
                </div>
                <div className="border-t border-borderColor pt-3">
                  <span className="text-[11px] text-textSecondary font-semibold uppercase block mb-1">Earnings</span>
                  <div className="flex justify-between text-textSecondary">
                    <span>Base Salary</span>
                    <span>₹{selectedPayslip.baseSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-textSecondary">
                    <span>HRA (40%)</span>
                    <span>₹{selectedPayslip.earnings.hra.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-textSecondary">
                    <span>Special Allowance</span>
                    <span>₹{selectedPayslip.earnings.specialAllowance.toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t border-borderColor pt-3">
                  <span className="text-[11px] text-textSecondary font-semibold uppercase block mb-1">Deductions & Compliance</span>
                  <div className="flex justify-between text-danger">
                    <span>Provident Fund (PF 12%)</span>
                    <span>-₹{selectedPayslip.deductions.pf.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-danger">
                    <span>ESI (0.75%)</span>
                    <span>-₹{selectedPayslip.deductions.esi.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-danger">
                    <span>TDS (Income Tax)</span>
                    <span>-₹{selectedPayslip.deductions.tds.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-danger">
                    <span>Professional Tax (PT)</span>
                    <span>-₹{selectedPayslip.deductions.pt.toLocaleString()}</span>
                  </div>
                  {selectedPayslip.lopDays > 0 && (
                    <div className="flex justify-between text-danger font-semibold">
                      <span>LOP ({selectedPayslip.lopDays} days)</span>
                      <span>-₹{selectedPayslip.deductions.lopDeduction.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-borderColor pt-3 flex justify-between font-bold text-[14px]">
                  <span>Net Salary</span>
                  <span className="text-success">₹{selectedPayslip.netSalary.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-textSecondary">
                Select an employee's payslip icon to view full breakdown, deductions, and tax compliance summary.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Payroll;
