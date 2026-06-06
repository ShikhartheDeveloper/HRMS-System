import mongoose from 'mongoose';

const onboardingSchema = new mongoose.Schema(
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
    tasks: [
      {
        title: { type: String, required: true },
        dueDate: { type: Date },
        assignedTo: { type: String, default: 'HR' },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date }
      }
    ],
    policySignOffs: [
      {
        policyName: { type: String, required: true },
        signedAt: { type: Date, default: null },
        signedBy: { type: String, default: null }
      }
    ],
    documents: [
      {
        name: { type: String, required: true },
        s3Key: { type: String, required: true },
        originalName: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        fileSize: { type: Number, default: 0 },
        expiryDate: { type: Date, default: null },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        uploadedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

const Onboarding = mongoose.model('Onboarding', onboardingSchema);
export default Onboarding;
