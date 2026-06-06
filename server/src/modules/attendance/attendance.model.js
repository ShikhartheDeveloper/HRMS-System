import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
      index: true
    },
    punchIn: {
      type: Date,
      default: null
    },
    punchOut: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'On Leave'],
      default: 'Absent',
      index: true
    },
    gpsIn: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    gpsOut: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    isRegularized: {
      type: Boolean,
      default: false
    },
    regularization: {
      reason: { type: String, default: '' },
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'None'], default: 'None', index: true },
      comments: { type: String, default: '' },
      requestedPunchIn: { type: Date },
      requestedPunchOut: { type: Date }
    },
    overtimeHours: {
      type: Number,
      default: 0
    },
    isEarlyOut: {
      type: Boolean,
      default: false
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

// Ensure only one attendance record per employee per day
attendanceSchema.index({ employeeId: 1, date: 1, tenantId: 1 }, { unique: true });

// Soft delete query middleware
attendanceSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
