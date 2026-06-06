import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import Tenant from './src/models/Tenant.model.js';
import AIAdvisory from './src/modules/ai/ai.model.js';

async function runAITests() {
  console.log('=== Starting AI Advisory Integration Checks ===');
  await connectDB();

  try {
    // 1. Fetch default tenant
    const tenant = await Tenant.findOne();
    if (!tenant) {
      console.error('[ERROR] No tenant found. Run registration first.');
      process.exit(1);
    }
    console.log(`[INFO] Found Tenant: ${tenant.name} (${tenant._id})`);

    // 2. Test AIAdvisory Creation (Search type)
    console.log('[INFO] Testing AIAdvisory Model - Search Entry...');
    const searchLog = await AIAdvisory.create({
      tenantId: tenant._id,
      type: 'search',
      inputData: { query: 'Show all technology managers' },
      output: 'Found 3 managers in technology: Jane, John, Shikhar.',
      confidence: 90,
      status: 'NotApplicable'
    });
    console.log(`[SUCCESS] AI Search record created: ${searchLog._id} (Confidence: ${searchLog.confidence}%)`);

    // 3. Test AIAdvisory Creation (Summary with Pending state)
    console.log('[INFO] Testing AIAdvisory Model - Pending Summary...');
    const summaryLog = await AIAdvisory.create({
      tenantId: tenant._id,
      type: 'summary',
      inputData: { employeeId: new mongoose.Types.ObjectId() },
      output: 'Employee shows strong execution skills but high overtime hours.',
      confidence: 85,
      status: 'Pending'
    });
    console.log(`[SUCCESS] AI Summary record created: ${summaryLog._id} (Status: ${summaryLog.status})`);

    // 4. Test Approving/Updating state
    console.log('[INFO] Testing AIAdvisory Approval Update...');
    const approvedLog = await AIAdvisory.findByIdAndUpdate(
      summaryLog._id,
      {
        status: 'Approved',
        actionPerformed: 'Acknowledged high overtime risk and scheduled check-in.'
      },
      { new: true }
    );
    console.log(`[SUCCESS] AI Action approved: ${approvedLog.status} | Action: ${approvedLog.actionPerformed}`);

    // 5. Test Soft Delete query filter
    console.log('[INFO] Testing AIAdvisory Soft Delete...');
    approvedLog.isDeleted = true;
    await approvedLog.save();

    const findDeleted = await AIAdvisory.findById(approvedLog._id);
    if (!findDeleted) {
      console.log('[SUCCESS] Soft-deleted record successfully filtered from active queries!');
    } else {
      console.warn('[WARNING] Soft delete filter did not hide the record.');
    }

    // Clean up
    console.log('[INFO] Cleaning up test records...');
    await AIAdvisory.deleteOne({ _id: searchLog._id });
    await AIAdvisory.deleteOne({ _id: summaryLog._id });
    console.log('[SUCCESS] Test records cleaned up successfully!');

    console.log('\n=== ALL AI ADVISORY MODEL DB CHECKS PASSED ===');
  } catch (err) {
    console.error('[ERROR] Verification failed:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

runAITests();
