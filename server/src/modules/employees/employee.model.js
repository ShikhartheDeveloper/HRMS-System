import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    employeeId: {
      type: String,
      required: true,
      index: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    designation: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP'],
      default: 'EMPLOYEE'
    },
    dateOfJoining: {
      type: Date,
      required: true,
      default: Date.now
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['Active', 'Terminated', 'On Leave', 'Suspended'],
      default: 'Active',
      index: true
    },
    salary: {
      type: Number,
      default: 0
    },
    profileImageUrl: {
      type: String,
      default: null
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

// Ensure unique employeeId per tenant
employeeSchema.index({ employeeId: 1, tenantId: 1 }, { unique: true });
// Ensure unique email per tenant
employeeSchema.index({ email: 1, tenantId: 1 }, { unique: true });

// Soft delete query middleware
employeeSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
