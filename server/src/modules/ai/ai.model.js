import mongoose from 'mongoose';

const aiAdvisorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['search', 'summary', 'workforce', 'attrition', 'attendance', 'resume'],
      required: true,
      index: true
    },
    inputData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    output: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      default: 75
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Dismissed', 'NotApplicable'],
      default: 'NotApplicable',
      index: true
    },
    actionPerformed: {
      type: String,
      default: null
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Soft delete query middleware
aiAdvisorySchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const AIAdvisory = mongoose.model('AIAdvisory', aiAdvisorySchema);
export default AIAdvisory;
