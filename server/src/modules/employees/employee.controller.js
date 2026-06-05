import * as employeeService from './employee.service.js';
import Employee from './employee.model.js';
import { paginate } from '../../utils/paginate.js';
import { getSignedDownloadUrl } from '../../config/s3Client.js';

// Safe helper to resolve S3 key to signed URL
const resolveProfileImageUrl = async (key) => {
  if (!key) return null;
  try {
    return await getSignedDownloadUrl(key);
  } catch (err) {
    console.error('Error resolving signed URL for profile image:', err);
    return null;
  }
};

export const getEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, department } = req.query;

    const filter = req.scopeQuery();

    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { employeeId: new RegExp(search, 'i') }
      ];
    }

    if (department) {
      filter.department = department;
    }

    const results = await paginate(Employee, filter, {
      page,
      limit,
      populate: { path: 'managerId', select: 'firstName lastName employeeId designation' },
      sort: { createdAt: -1 }
    });

    // Resolve profile image URLs for list view
    const formattedData = await Promise.all(
      results.data.map(async (emp) => {
        const empObj = emp.toObject();
        if (empObj.profileImageUrl) {
          empObj.profileImageUrl = await resolveProfileImageUrl(empObj.profileImageUrl);
        }
        return empObj;
      })
    );

    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: results.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne(req.scopeQuery({ _id: req.params.id }))
      .populate('managerId', 'firstName lastName employeeId designation')
      .populate('userId', 'email role');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' }
      });
    }

    // Convert mongoose object to writeable plain object to modify fields
    const employeeObj = employee.toObject();

    // Check permissions for salary view
    const isSelf = req.user.id.toString() === employee.userId?.toString();
    const isAdminOrLeadership = ['HR_ADMIN', 'LEADERSHIP'].includes(req.user.role);
    if (!isSelf && !isAdminOrLeadership) {
      delete employeeObj.salary;
    }

    // Resolve profile image URL
    if (employeeObj.profileImageUrl) {
      employeeObj.profileImageUrl = await resolveProfileImageUrl(employeeObj.profileImageUrl);
    }

    res.status(200).json({
      success: true,
      data: employeeObj
    });
  } catch (error) {
    next(error);
  }
};


export const createEmployee = async (req, res, next) => {
  try {
    const newEmployee = await employeeService.createEmployee(
      req.body,
      req.user.tenantId,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: newEmployee
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const updatedEmployee = await employeeService.updateEmployee(
      req.params.id,
      req.body,
      req.user.tenantId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const result = await employeeService.deleteEmployee(
      req.params.id,
      req.user.tenantId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const getOrgChart = async (req, res, next) => {
  try {
    const employees = await employeeService.getOrgChart(req.user.tenantId);
    res.status(200).json({
      success: true,
      data: employees
    });
  } catch (error) {
    next(error);
  }
};

export const bulkImport = async (req, res, next) => {
  try {
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'CSV list of employees is missing or invalid' }
      });
    }

    const results = await employeeService.bulkImportEmployees(
      employees,
      req.user.tenantId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: `Bulk import completed: ${results.success} succeeded, ${results.failed} failed.`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};
