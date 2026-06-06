import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['Travel', 'Meals', 'Office Supplies', 'Hardware', 'Software', 'Utilities', 'Others'],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    claimDate: {
      type: Date,
      default: Date.now
    },
    receiptUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true
    },
    approvalHistory: [
      {
        approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        action: { type: String, enum: ['Approve', 'Reject'] },
        comments: { type: String, default: '' },
        actionedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
