import mongoose from 'mongoose';

const reportJobSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['headcount', 'attendance-summary', 'leave-usage', 'attrition'],
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed'],
      default: 'Pending',
      index: true
    },
    resultUrl: {
      type: String,
      default: ''
    },
    error: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Apply soft delete query middleware
reportJobSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

// Add isDeleted field just in case
reportJobSchema.add({
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
});

const ReportJob = mongoose.model('ReportJob', reportJobSchema);
export default ReportJob;
