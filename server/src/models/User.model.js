import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'],
      default: 'EMPLOYEE',
      required: true
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockoutUntil: {
      type: Date,
      default: null
    },
    otpCode: {
      type: String,
      default: null,
      select: false
    },
    otpExpiry: {
      type: Date,
      default: null,
      select: false
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

// Compound index to ensure email is unique per tenant
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });

// Password hashing before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user is locked out helper
userSchema.methods.isLockedOut = function () {
  return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
};

// Soft delete query middleware
userSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const User = mongoose.model('User', userSchema);
export default User;
