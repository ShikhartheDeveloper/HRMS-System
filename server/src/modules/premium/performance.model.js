import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema(
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
    cycle: {
      type: String, // e.g. "Q1 2026", "Annual 2026"
      required: true
    },
    goals: [
      {
        title: { type: String, required: true },
        target: { type: String, default: '' },
        progress: { type: Number, default: 0 }, // 0 to 100
        status: { type: String, enum: ['Not Started', 'In Progress', 'Achieved', 'Deferred'], default: 'Not Started' },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    reviews: [
      {
        reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
        reviewerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewerRole: { type: String, enum: ['Self', 'Manager', 'Peer', 'Direct Report', 'HR Admin', 'Leadership'] },
        rating: { type: Number, min: 1, max: 5, required: true },
        feedback: { type: String, default: '' },
        submittedAt: { type: Date, default: Date.now }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    finalRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    calibrationNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Performance = mongoose.model('Performance', performanceSchema);
export default Performance;
