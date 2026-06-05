import * as attendanceService from './attendance.service.js';
import Attendance from './attendance.model.js';
import Employee from '../employees/employee.model.js';
import { paginate } from '../../utils/paginate.js';

export const punchIn = async (req, res, next) => {
  try {
    const { gps } = req.body;
    const record = await attendanceService.punchIn(req.user.id, gps, req.user.tenantId);
    
    res.status(200).json({
      success: true,
      message: 'Punch-in logged successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

export const punchOut = async (req, res, next) => {
  try {
    const { gps } = req.body;
    const record = await attendanceService.punchOut(req.user.id, gps, req.user.tenantId);
    
    res.status(200).json({
      success: true,
      message: 'Punch-out logged successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 31 } = req.query;
    const employee = await Employee.findOne({ userId: req.user.id, tenantId: req.user.tenantId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' }
      });
    }

    const results = await paginate(Attendance, req.scopeQuery({ employeeId: employee._id }), {
      page,
      limit,
      sort: { date: -1 }
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

export const getTeamRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, employeeId, status } = req.query;
    const manager = await Employee.findOne({ userId: req.user.id, tenantId: req.user.tenantId });
    
    if (!manager && req.user.role !== 'HR_ADMIN' && req.user.role !== 'LEADERSHIP') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You must be a manager or administrator to view team records' }
      });
    }

    const query = req.scopeQuery();

    // If not HR/Leadership, limit query to direct reports of this manager
    if (req.user.role !== 'HR_ADMIN' && req.user.role !== 'LEADERSHIP') {
      const directReportIds = await Employee.find({ managerId: manager._id, tenantId: req.user.tenantId }).select('_id');
      query.employeeId = { $in: directReportIds.map(e => e._id) };
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }
    if (status) {
      query.status = status;
    }

    const results = await paginate(Attendance, query, {
      page,
      limit,
      populate: { path: 'employeeId', select: 'firstName lastName employeeId designation department' },
      sort: { date: -1 }
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

export const requestRegularization = async (req, res, next) => {
  try {
    const record = await attendanceService.applyRegularization(req.user.id, req.body, req.user.tenantId);
    res.status(200).json({
      success: true,
      message: 'Regularization request submitted successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

export const reviewRegularization = async (req, res, next) => {
  try {
    const record = await attendanceService.reviewRegularization(
      req.params.id,
      req.body,
      req.user.tenantId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: `Regularization request has been ${req.body.status.toLowerCase()}`,
      data: record
    });
  } catch (error) {
    next(error);
  }
};
