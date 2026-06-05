import mongoose from 'mongoose';
import Employee from './employee.model.js';
import User from '../../models/User.model.js';
import { generateEmployeeId } from '../../utils/generateEmployeeId.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { paginate } from '../../utils/paginate.js';

export const createEmployee = async (employeeData, tenantId, creatorId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password, role, ...profileDetails } = employeeData;

    // Check if email already exists
    const existingUser = await User.findOne({ email, tenantId }).session(session);
    if (existingUser) {
      throw { statusCode: 400, code: 'EMAIL_EXISTS', message: 'An employee with this email already exists' };
    }

    // Create User record
    const newUser = await User.create([{
      email,
      password,
      role,
      tenantId
    }], { session });

    // Generate Employee ID
    const employeeId = await generateEmployeeId(tenantId);

    // Create Employee Profile
    const newEmployee = await Employee.create([{
      ...profileDetails,
      email,
      role,
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
