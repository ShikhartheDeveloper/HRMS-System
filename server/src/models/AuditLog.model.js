import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    targetId: {
      type: String,
      required: false,
      index: true
    },
    meta: {
      type: mongoose.Schema.Types.Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Soft delete query middleware (just in case, though there are no delete routes)
auditLogSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
