import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    settings: {
      gracePeriodMinutes: { type: Number, default: 15 },
      lateThresholdMinutes: { type: Number, default: 30 },
      halfDayThresholdHours: { type: Number, default: 4 },
      fullDayHours: { type: Number, default: 8 }
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

// Apply soft delete query middleware
tenantSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const Tenant = mongoose.model('Tenant', tenantSchema);
export default Tenant;
