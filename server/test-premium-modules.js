import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import User from './src/models/User.model.js';
import Tenant from './src/models/Tenant.model.js';
import Employee from './src/modules/employees/employee.model.js';

// Premium Models
import Payroll from './src/modules/premium/payroll.model.js';
import Performance from './src/modules/premium/performance.model.js';
import { Job, Candidate } from './src/modules/premium/recruitment.model.js';
import Onboarding from './src/modules/premium/onboarding.model.js';
import Expense from './src/modules/premium/expense.model.js';
import { Course, TrainingProgress } from './src/modules/premium/training.model.js';
import Asset from './src/modules/premium/asset.model.js';
import Ticket from './src/modules/premium/ticket.model.js';

async function runTests() {
  console.log('=== Starting Premium Modules Integration Checks ===');
  await connectDB();

  try {
    // 1. Fetch default tenant and employee
    const tenant = await Tenant.findOne();
    if (!tenant) {
      console.error('No tenant found. Run registration first.');
      process.exit(1);
    }
    console.log(`[INFO] Found Tenant: ${tenant.name} (${tenant._id})`);

    let employee = await Employee.findOne();
    let createdMockUser = null;
    let createdMockEmployee = null;

    if (!employee) {
      console.log('[INFO] No employee found, creating a mock user and employee for verification...');
      let userObj = await User.findOne();
      if (!userObj) {
        userObj = await User.create({
          tenantId: tenant._id,
          email: 'mock.tester@example.com',
          password: 'password123',
          role: 'HR_ADMIN'
        });
        createdMockUser = userObj;
      }

      employee = await Employee.create({
        tenantId: tenant._id,
        userId: userObj._id,
        employeeId: 'EMP-MOCK-99',
        firstName: 'Mock',
        lastName: 'Tester',
        email: 'mock.tester@example.com',
        department: 'Engineering',
        designation: 'Staff Engineer'
      });
      createdMockEmployee = employee;
    }
    console.log(`[INFO] Using Employee: ${employee.firstName} ${employee.lastName} (${employee._id})`);

    // 2. Test Payroll Model
    console.log('[INFO] Testing Payroll Model...');
    const payroll = await Payroll.create({
      tenantId: tenant._id,
      employeeId: employee._id,
      month: '2026-06',
      baseSalary: 60000,
      netSalary: 52000,
      status: 'Draft'
    });
    console.log(`[SUCCESS] Payroll record created: ${payroll._id}`);

    // 3. Test Performance Model
    console.log('[INFO] Testing Performance Model...');
    const perf = await Performance.create({
      tenantId: tenant._id,
      employeeId: employee._id,
      cycle: 'Q2 2026',
      goals: [{ title: 'Implement premium modules', target: '100% completion', progress: 50 }],
      reviews: [{ reviewerRole: 'Manager', rating: 5, feedback: 'Excellent effort!' }]
    });
    console.log(`[SUCCESS] Performance record created: ${perf._id}`);

    // 4. Test Recruitment Model
    console.log('[INFO] Testing Recruitment Model...');
    const job = await Job.create({
      title: 'QA Lead',
      department: 'Engineering',
      status: 'Open'
    });
    const cand = await Candidate.create({
      tenantId: tenant._id,
      jobId: job._id,
      firstName: 'Test',
      lastName: 'Applicant',
      email: 'testapp@example.com',
      stage: 'Applied'
    });
    console.log(`[SUCCESS] Job & Candidate created: Job (${job._id}), Candidate (${cand._id})`);

    // 5. Test Onboarding Model
    console.log('[INFO] Testing Onboarding Model...');
    const onb = await Onboarding.create({
      tenantId: tenant._id,
      employeeId: employee._id,
      tasks: [{ title: 'Sign NDA policy', completed: false }]
    });
    console.log(`[SUCCESS] Onboarding record created: ${onb._id}`);

    // 6. Test Expense Model
    console.log('[INFO] Testing Expense Model...');
    const exp = await Expense.create({
      tenantId: tenant._id,
      employeeId: employee._id,
      title: 'Office desk monitor',
      category: 'Hardware',
      amount: 15000,
      status: 'Pending'
    });
    console.log(`[SUCCESS] Expense record created: ${exp._id}`);

    // 7. Test Training Model
    console.log('[INFO] Testing Training Model...');
    const course = await Course.create({
      title: 'Advanced NodeJS',
      durationHours: 12
    });
    const prog = await TrainingProgress.create({
      tenantId: tenant._id,
      employeeId: employee._id,
      courseId: course._id,
      status: 'Enrolled'
    });
    console.log(`[SUCCESS] Course & TrainingProgress created: Course (${course._id}), Progress (${prog._id})`);

    // 8. Test Asset Model
    console.log('[INFO] Testing Asset Model...');
    const asset = await Asset.create({
      tenantId: tenant._id,
      name: 'Macbook Air M2',
      serialNumber: 'SN987654321',
      category: 'Laptop',
      cost: 95000,
      purchaseDate: new Date()
    });
    console.log(`[SUCCESS] Asset record created: ${asset._id}`);

    // 9. Test Ticket Model
    console.log('[INFO] Testing Ticket Model...');
    const ticket = await Ticket.create({
      tenantId: tenant._id,
      employeeId: employee._id,
      title: 'Internet speed drop',
      description: 'The connection is very slow today.',
      category: 'IT',
      priority: 'High'
    });
    console.log(`[SUCCESS] Ticket record created: ${ticket._id}`);

    // Clean up test records
    console.log('[INFO] Cleaning up test records...');
    await Payroll.deleteOne({ _id: payroll._id });
    await Performance.deleteOne({ _id: perf._id });
    await Job.deleteOne({ _id: job._id });
    await Candidate.deleteOne({ _id: cand._id });
    await Onboarding.deleteOne({ _id: onb._id });
    await Expense.deleteOne({ _id: exp._id });
    await Course.deleteOne({ _id: course._id });
    await TrainingProgress.deleteOne({ _id: prog._id });
    await Asset.deleteOne({ _id: asset._id });
    await Ticket.deleteOne({ _id: ticket._id });
    if (createdMockEmployee) {
      await Employee.deleteOne({ _id: createdMockEmployee._id });
    }
    if (createdMockUser) {
      await User.deleteOne({ _id: createdMockUser._id });
    }
    console.log('[SUCCESS] Cleaned up all test records successfully!');

    console.log('\n=== ALL PREMIUM MODULES DB CHECKS PASSED ===');
  } catch (err) {
    console.error('[ERROR] Verification failed:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

runTests();
