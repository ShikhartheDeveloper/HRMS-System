import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    month: {
      type: String, // format YYYY-MM
      required: true,
      index: true
    },
    baseSalary: {
      type: Number,
      required: true
    },
    earnings: {
      hra: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      reimbursement: { type: Number, default: 0 }
    },
    deductions: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      pt: { type: Number, default: 0 },
      lopDeduction: { type: Number, default: 0 }
    },
    lopDays: {
      type: Number,
      default: 0
    },
    netSalary: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Processed', 'Paid'],
      default: 'Draft'
    },
    bankName: {
      type: String,
      default: ''
    },
    accountNumber: {
      type: String,
      default: ''
    },
    ifscCode: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Payroll = mongoose.model('Payroll', payrollSchema);
export default Payroll;
