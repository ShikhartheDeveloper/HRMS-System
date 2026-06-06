import Tenant from '../models/Tenant.model.js';
import User from '../models/User.model.js';
import Employee from '../modules/employees/employee.model.js';

export const seedDatabase = async () => {
  try {
    // Check if Tenant exists
    const tenantCount = await Tenant.countDocuments();
    if (tenantCount > 0) {
      console.log('Database already has seeded data. Skipping seed.');
      return;
    }

    console.log('No tenant found. Seeding default database data...');

    // 1. Create Tenant
    const tenant = await Tenant.create({
      name: 'Default Org',
      subdomain: 'default',
      settings: {
        gracePeriodMinutes: 15,
        lateThresholdMinutes: 30,
        halfDayThresholdHours: 4,
        fullDayHours: 8
      }
    });

    console.log(`Default Tenant created: ${tenant.name} (${tenant._id})`);

    // 2. Create HR Admin User
    const adminUser = await User.create({
      email: 'admin@default.com',
      password: 'Password123',
      role: 'HR_ADMIN',
      tenantId: tenant._id
    });

    const adminEmployee = await Employee.create({
      tenantId: tenant._id,
      userId: adminUser._id,
      employeeId: 'EMP-2026-0001',
      firstName: 'HR',
      lastName: 'Admin',
      email: 'admin@default.com',
      phone: '1234567890',
      department: 'Human Resources',
      designation: 'HR Director',
      role: 'HR_ADMIN',
      salary: 120000,
      status: 'Active'
    });

    console.log(`HR Admin seeded: ${adminEmployee.firstName} ${adminEmployee.lastName}`);

    // 3. Create Manager User
    const managerUser = await User.create({
      email: 'manager@default.com',
      password: 'Password123',
      role: 'MANAGER',
      tenantId: tenant._id
    });

    const managerEmployee = await Employee.create({
      tenantId: tenant._id,
      userId: managerUser._id,
      employeeId: 'EMP-2026-0002',
      firstName: 'Jane',
      lastName: 'Manager',
      email: 'manager@default.com',
      phone: '2345678901',
      department: 'Engineering',
      designation: 'Engineering Manager',
      role: 'MANAGER',
      salary: 95000,
      status: 'Active'
    });

    console.log(`Manager seeded: ${managerEmployee.firstName} ${managerEmployee.lastName}`);

    // 4. Create standard Employee User (reporting to Manager)
    const employeeUser = await User.create({
      email: 'employee@default.com',
      password: 'Password123',
      role: 'EMPLOYEE',
      tenantId: tenant._id
    });

    const standardEmployee = await Employee.create({
      tenantId: tenant._id,
      userId: employeeUser._id,
      employeeId: 'EMP-2026-0003',
      firstName: 'John',
      lastName: 'Developer',
      email: 'employee@default.com',
      phone: '3456789012',
      department: 'Engineering',
      designation: 'Software Engineer',
      role: 'EMPLOYEE',
      managerId: managerEmployee._id,
      salary: 75000,
      status: 'Active'
    });

    console.log(`Employee seeded: ${standardEmployee.firstName} ${standardEmployee.lastName} (reports to Jane Manager)`);

    // 5. Create Leadership User
    const leadershipUser = await User.create({
      email: 'leadership@default.com',
      password: 'Password123',
      role: 'LEADERSHIP',
      tenantId: tenant._id
    });

    const leadershipEmployee = await Employee.create({
      tenantId: tenant._id,
      userId: leadershipUser._id,
      employeeId: 'EMP-2026-0004',
      firstName: 'Robert',
      lastName: 'Director',
      email: 'leadership@default.com',
      phone: '4567890123',
      department: 'Executive',
      designation: 'Managing Director',
      role: 'LEADERSHIP',
      salary: 180000,
      status: 'Active'
    });

    console.log(`Leadership seeded: ${leadershipEmployee.firstName} ${leadershipEmployee.lastName}`);
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding database failed:', error.message);
  }
};
export default seedDatabase;
