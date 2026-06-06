import mongoose from 'mongoose';
import Employee from './employee.model.js';
import User from '../../models/User.model.js';
import { generateEmployeeId } from '../../utils/generateEmployeeId.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { paginate } from '../../utils/paginate.js';
import { sendEmail } from '../../utils/sendEmail.js';

export const createEmployee = async (employeeData, tenantId, creatorId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password, role, ...profileDetails } = employeeData;
    const finalPassword = password || 'Password123';
    const finalRole = role || 'EMPLOYEE';

    // Check if email already exists
    const existingUser = await User.findOne({ email, tenantId }).session(session);
    if (existingUser) {
      throw { statusCode: 400, code: 'EMAIL_EXISTS', message: 'An employee with this email already exists' };
    }

    // Create User record
    const newUser = await User.create([{
      email,
      password: finalPassword,
      role: finalRole,
      tenantId
    }], { session });

    // Generate Employee ID
    const employeeId = await generateEmployeeId(tenantId);

    // Create Employee Profile
    const newEmployee = await Employee.create([{
      ...profileDetails,
      email,
      role: finalRole,
      employeeId,
      userId: newUser[0]._id,
      tenantId
    }], { session });

    await session.commitTransaction();
    session.endSession();

    await writeAuditLog({
      action: 'EMPLOYEE_CREATED',
      tenantId,
      userId: creatorId,
      targetId: newEmployee[0].employeeId,
      meta: { email, employeeId }
    });

    // Send welcome onboarding email
    sendEmail({
      to: email,
      subject: 'Welcome to HRMS Elite!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
          <div style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">HRMS Elite</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Your Enterprise HR Portal</p>
          </div>
          <div style="padding: 25px 0;">
            <h3 style="color: #0f172a; font-size: 18px; margin-top: 0;">Welcome to the Team, ${profileDetails.firstName}!</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">We are thrilled to welcome you. An account has been set up for you in the company directory. You can log in using the details below:</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Portal URL:</strong> <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="color: #4f46e5; font-weight: bold; text-decoration: none;">${process.env.CLIENT_URL || 'http://localhost:5173'}</a></p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Subdomain:</strong> Use your workspace subdomain</p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Email Address:</strong> ${email}</p>
              <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Password:</strong> ${password}</p>
            </div>
            
            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">For security purposes, we highly recommend changing your password after logging in for the first time by visiting your profile settings.</p>
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            This is an automated system email from HRMS Elite. Please do not reply directly.
          </div>
        </div>
      `
    }).catch(err => console.error('Onboarding email sending failed:', err));

    return newEmployee[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// Circular Hierarchy Prevention
export const isCircularHierarchy = async (employeeId, targetManagerId, tenantId) => {
  if (!targetManagerId) return false;
  if (employeeId.toString() === targetManagerId.toString()) return true;

  let currentId = targetManagerId;
  const visited = new Set([employeeId.toString()]);

  while (currentId) {
    if (visited.has(currentId.toString())) {
      return true; // Loop detected!
    }
    visited.add(currentId.toString());
    const manager = await Employee.findOne({ _id: currentId, tenantId }).select('managerId').lean();
    currentId = manager ? manager.managerId : null;
  }
  return false;
};

export const updateEmployee = async (id, updateData, tenantId, updaterId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const employee = await Employee.findOne({ _id: id, tenantId }).session(session);
    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' };
    }

    // Check circular manager assignments
    if (updateData.managerId) {
      const isCircular = await isCircularHierarchy(id, updateData.managerId, tenantId);
      if (isCircular) {
        throw { statusCode: 400, code: 'CIRCULAR_HIERARCHY', message: 'Setting this manager creates a circular hierarchy loop' };
      }
    }

    // If role changed, sync User record role
    if (updateData.role && updateData.role !== employee.role) {
      await User.findByIdAndUpdate(employee.userId, { role: updateData.role }, { session });
    }

    // Apply updates
    Object.assign(employee, updateData);
    await employee.save({ session });

    await session.commitTransaction();
    session.endSession();

    await writeAuditLog({
      action: 'EMPLOYEE_UPDATED',
      tenantId,
      userId: updaterId,
      targetId: employee.employeeId,
      meta: { id, updateKeys: Object.keys(updateData) }
    });

    return employee;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const deleteEmployee = async (id, tenantId, deleterId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const employee = await Employee.findOne({ _id: id, tenantId }).session(session);
    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' };
    }

    // Soft delete Employee and User
    employee.isDeleted = true;
    employee.deletedAt = new Date();
    await employee.save({ session });

    await User.findByIdAndUpdate(employee.userId, {
      isDeleted: true,
      deletedAt: new Date()
    }, { session });

    await session.commitTransaction();
    session.endSession();

    await writeAuditLog({
      action: 'EMPLOYEE_SOFT_DELETED',
      tenantId,
      userId: deleterId,
      targetId: employee.employeeId,
      meta: { id, email: employee.email }
    });

    return { message: 'Employee soft deleted successfully' };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getOrgChart = async (tenantId) => {
  // Pull all active employees with essential fields
  const employees = await Employee.find({ tenantId, status: 'Active' })
    .select('firstName lastName email designation department managerId employeeId')
    .lean();

  return employees;
};

export const bulkImportEmployees = async (employeesList, tenantId, creatorId) => {
  const results = { success: 0, failed: 0, errors: [] };
  
  for (const emp of employeesList) {
    try {
      // Validate row fields
      if (!emp.email || !emp.firstName || !emp.lastName || !emp.department || !emp.designation) {
        results.failed += 1;
        results.errors.push({ email: emp.email || 'N/A', error: 'Missing mandatory fields' });
        continue;
      }

      await createEmployee({
        email: emp.email,
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department,
        designation: emp.designation,
        role: emp.role || 'EMPLOYEE',
        salary: emp.salary || 0,
        phone: emp.phone || ''
      }, tenantId, creatorId);

      results.success += 1;
    } catch (err) {
      results.failed += 1;
      results.errors.push({ email: emp.email, error: err.message || 'Validation error' });
    }
  }

  await writeAuditLog({
    action: 'EMPLOYEE_BULK_IMPORT',
    tenantId,
    userId: creatorId,
    meta: { successCount: results.success, failedCount: results.failed }
  });

  return results;
};
