import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  durationHours: { type: Number, required: true },
  skillsTaught: [{ type: String }], // Skills mapped for skills matrix
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const progressSchema = new mongoose.Schema(
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    status: {
      type: String,
      enum: ['Enrolled', 'In Progress', 'Completed'],
      default: 'Enrolled',
      index: true
    },
    progressPercent: {
      type: Number,
      default: 0
    },
    completedAt: {
      type: Date,
      default: null
    },
    certificateUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const Course = mongoose.model('Course', courseSchema);
export const TrainingProgress = mongoose.model('TrainingProgress', progressSchema);
