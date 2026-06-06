import * as employeeService from './employee.service.js';
import Employee from './employee.model.js';
import { paginate } from '../../utils/paginate.js';
import { getSignedDownloadUrl } from '../../config/s3Client.js';
import { sendEmail } from '../../utils/sendEmail.js';

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
        const empObj = { ...emp };
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

export const sendEmployeeEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Subject and message fields are required' }
      });
    }

    // Scoped query ensures that users can only find employees belonging to their own tenant
    const employee = await Employee.findOne(req.scopeQuery({ _id: id }));
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' }
      });
    }

    const emailSent = await sendEmail({
      to: employee.email,
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
          <div style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">HRMS Portal Notice</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Official Communication</p>
          </div>
          <div style="padding: 25px 0; color: #334155; font-size: 14px; line-height: 1.6;">
            <p>Dear ${employee.firstName} ${employee.lastName},</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; white-space: pre-wrap; font-size: 14.5px; color: #0f172a; margin-top: 15px; margin-bottom: 15px;">${message}</div>
            <p style="color: #64748b; font-size: 12px; margin-top: 25px;">Please review the above notice from human resources or your manager. If you have any questions, contact your designated HR representative.</p>
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8;">
            This is an official communication sent via the HRMS portal.
          </div>
        </div>
      `
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Email delivery failed. Please verify SMTP credentials are configured correctly in the server environment.'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email sent successfully to employee'
    });
  } catch (error) {
    next(error);
  }
};

