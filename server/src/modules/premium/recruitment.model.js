import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  title: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  location: { type: String, default: 'Remote', trim: true },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time'
  },
  status: { type: String, enum: ['Open', 'Closed', 'Draft'], default: 'Open', index: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  imageOriginalName: { type: String, default: '' },
  imageMimeType: { type: String, default: '' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  postedByEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null }
}, { timestamps: true });

jobSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

const candidateSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    stage: {
      type: String,
      enum: ['Applied', 'Screening', 'Interviewing', 'Offered', 'Hired', 'Rejected'],
      default: 'Applied',
      index: true
    },
    interviews: [
      {
        scheduledAt: { type: Date },
        interviewer: { type: String },
        feedback: { type: String, default: '' },
        rating: { type: Number, min: 1, max: 5 }
      }
    ],
    offerDetails: {
      salary: { type: Number },
      joiningDate: { type: Date },
      status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' }
    }
  },
  {
    timestamps: true
  }
);

export const Job = mongoose.model('Job', jobSchema);
export const Candidate = mongoose.model('Candidate', candidateSchema);
