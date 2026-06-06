import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    serialNumber: {
      type: String,
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: ['Laptop', 'Mobile', 'Monitor', 'Accessories', 'Furniture', 'Other'],
      required: true
    },
    cost: {
      type: Number,
      required: true
    },
    purchaseDate: {
      type: Date,
      required: true
    },
    currentEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['Available', 'Allocated', 'Maintenance', 'Retired'],
      default: 'Available',
      index: true
    },
    maintenanceLogs: [
      {
        scheduledAt: { type: Date },
        completedAt: { type: Date },
        cost: { type: Number },
        notes: { type: String }
      }
    ],
    depreciationRate: {
      type: Number, // Percentage per year
      default: 10
    }
  },
  {
    timestamps: true
  }
);

const Asset = mongoose.model('Asset', assetSchema);
export default Asset;
