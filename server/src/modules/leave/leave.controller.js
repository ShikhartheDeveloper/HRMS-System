import * as leaveService from './leave.service.js';
import Leave from './leave.model.js';
import Employee from '../employees/employee.model.js';
import { paginate } from '../../utils/paginate.js';

export const applyLeave = async (req, res, next) => {
  try {
    const leave = await leaveService.applyLeave(req.user.id, req.body, req.user.tenantId);
    res.status(201).json({
      success: true,
      message: 'Leave applied successfully',
      data: leave
    });
  } catch (error) {
    next(error);
  }
};

export const getBalances = async (req, res, next) => {
  try {
    // If checking another employee, check if they are HR/Leadership or manager
    const targetEmployeeId = req.query.employeeId;
    let employeeId;

    if (targetEmployeeId) {
      const targetEmp = await Employee.findOne(req.scopeQuery({ _id: targetEmployeeId }));
      if (!targetEmp) {
        return res.status(404).json({
          success: false,
          error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' }
        });
      }
      employeeId = targetEmp._id;
    } else {
      const employee = await Employee.findOne({ userId: req.user.id, tenantId: req.user.tenantId });
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' }
        });
      }
      employeeId = employee._id;
    }

    const balances = await leaveService.getLeaveBalances(employeeId, req.user.tenantId);
    
    res.status(200).json({
      success: true,
      data: balances
    });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const employee = await Employee.findOne({ userId: req.user.id, tenantId: req.user.tenantId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' }
      });
    }

    const query = req.scopeQuery({ employeeId: employee._id });
    if (status) {
      query.status = status;
    }

    const results = await paginate(Leave, query, {
      page,
      limit,
      sort: { startDate: -1 }
    });

    res.status(200).json({
      success: true,
      data: results.data,
      pagination: results.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const approveLeave = async (req, res, next) => {
  try {
    const leave = await leaveService.reviewLeave(
      req.params.id,
      req.body,
      req.user.tenantId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: `Leave has been ${req.body.status.toLowerCase()}`,
      data: leave
    });
  } catch (error) {
    next(error);
  }
};

export const cancelLeave = async (req, res, next) => {
  try {
    const leave = await leaveService.cancelLeave(req.params.id, req.user.tenantId, req.user.id);
    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: leave
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamCalendar = async (req, res, next) => {
  try {
    // Returns active leave requests to plot on team schedules
    const calendarLeaves = await Leave.find(req.scopeQuery({
      status: { $in: ['Approved', 'Pending'] }
    }))
      .populate('employeeId', 'firstName lastName employeeId designation department')
      .sort({ startDate: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: calendarLeaves
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingApprovals = async (req, res, next) => {
  try {
    // If not manager/admin, return empty or forbidden
    const employee = await Employee.findOne({ userId: req.user.id, tenantId: req.user.tenantId });
    
    const query = req.scopeQuery({ status: 'Pending' });

    if (req.user.role !== 'HR_ADMIN' && req.user.role !== 'LEADERSHIP') {
      if (!employee) {
        return res.status(200).json({ success: true, data: [] });
      }
      // If manager, show direct reports AND employees with no manager assigned
      const directReportIds = await Employee.find({ managerId: employee._id, tenantId: req.user.tenantId }).select('_id');
      const orphanIds = await Employee.find({ managerId: null, tenantId: req.user.tenantId, _id: { $ne: employee._id } }).select('_id');
      const allIds = [...directReportIds.map(e => e._id), ...orphanIds.map(e => e._id)];
      query.employeeId = { $in: allIds };
    }

    const leaves = await Leave.find(query)
      .populate('employeeId', 'firstName lastName employeeId designation department managerId')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    next(error);
  }
};
