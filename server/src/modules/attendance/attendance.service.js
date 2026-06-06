import Attendance from './attendance.model.js';
import Employee from '../employees/employee.model.js';
import Tenant from '../../models/Tenant.model.js';
import Notification from '../../models/Notification.model.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { paginate } from '../../utils/paginate.js';

// GPS Geofencing Mock Validator (Checks if coordinates are present)
const checkGpsValidation = (gps) => {
  if (!gps || typeof gps.latitude !== 'number' || typeof gps.longitude !== 'number') {
    throw { statusCode: 400, code: 'GPS_VALIDATION_FAILED', message: 'Valid GPS coordinates are required for punching' };
  }
  return true;
};

// Helper: Get today's start and end timestamps
const getDayRange = (targetDate = new Date()) => {
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const punchIn = async (userId, gps, tenantId) => {
  const employee = await Employee.findOne({ userId, tenantId });
  if (!employee) {
    throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' };
  }

  if (gps) {
    checkGpsValidation(gps);
  }

  const { start, end } = getDayRange();

  // Check if attendance already exists for today
  let record = await Attendance.findOne({
    employeeId: employee._id,
    date: { $gte: start, $lte: end },
    tenantId
  });

  if (record && record.punchIn) {
    throw { statusCode: 400, code: 'ALREADY_PUNCHED_IN', message: 'You have already punched in for today' };
  }

  // Get Tenant rules for grace period
  const tenant = await Tenant.findById(tenantId);
  const graceMinutes = tenant?.settings?.gracePeriodMinutes || 15;

  // Let's assume standard shift start is 9:00 AM today
  const shiftStart = new Date();
  shiftStart.setHours(9, 0, 0, 0);

  const now = new Date();
  const diffMinutes = (now - shiftStart) / (1000 * 60);

  let status = 'Present';
  if (diffMinutes > graceMinutes) {
    status = 'Late';
  }

  if (!record) {
    record = new Attendance({
      tenantId,
      employeeId: employee._id,
      date: new Date(),
      punchIn: now,
      status,
      gpsIn: gps || { latitude: 0, longitude: 0 }
    });
  } else {
    // If empty record existed, update it
    record.punchIn = now;
    record.status = status;
    record.gpsIn = gps || { latitude: 0, longitude: 0 };
  }

  await record.save();

  await writeAuditLog({
    action: 'ATTENDANCE_PUNCH_IN',
    tenantId,
    userId,
    targetId: record._id.toString(),
    meta: { time: now, status }
  });

  return record;
};

export const punchOut = async (userId, gps, tenantId) => {
  const employee = await Employee.findOne({ userId, tenantId });
  if (!employee) {
    throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' };
  }

  if (gps) {
    checkGpsValidation(gps);
  }

  const { start, end } = getDayRange();

  const record = await Attendance.findOne({
    employeeId: employee._id,
    date: { $gte: start, $lte: end },
    tenantId
  });

  if (!record || !record.punchIn) {
    throw { statusCode: 400, code: 'NO_PUNCH_IN', message: 'Cannot punch out without a matching punch in' };
  }

  if (record.punchOut) {
    throw { statusCode: 400, code: 'ALREADY_PUNCHED_OUT', message: 'You have already punched out for today' };
  }

  const now = new Date();
  record.punchOut = now;
  record.gpsOut = gps || { latitude: 0, longitude: 0 };

  // Calculate work hours
  const hoursWorked = (now - record.punchIn) / (1000 * 60 * 60);
  
  // Shift rule details
  const tenant = await Tenant.findById(tenantId);
  const fullDayHours = tenant?.settings?.fullDayHours || 8;

  // Calculate Overtime (hours worked beyond full shift)
  if (hoursWorked > fullDayHours) {
    record.overtimeHours = parseFloat((hoursWorked - fullDayHours).toFixed(2));
  }

  // Calculate if early clock out
  const shiftStart = new Date(record.punchIn);
  shiftStart.setHours(9, 0, 0, 0);
  const shiftEnd = new Date(shiftStart.getTime() + (fullDayHours * 60 * 60 * 1000));
  record.isEarlyOut = now < shiftEnd;

  await record.save();

  await writeAuditLog({
    action: 'ATTENDANCE_PUNCH_OUT',
    tenantId,
    userId,
    targetId: record._id.toString(),
    meta: { time: now, hoursWorked, overtime: record.overtimeHours }
  });

  return record;
};

export const applyRegularization = async (userId, regularizationDetails, tenantId) => {
  const employee = await Employee.findOne({ userId, tenantId });
  if (!employee) {
    throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' };
  }

  const { date, reason, requestedPunchIn, requestedPunchOut } = regularizationDetails;
  const { start, end } = getDayRange(new Date(date));

  // Find or create attendance for that date
  let record = await Attendance.findOne({
    employeeId: employee._id,
    date: { $gte: start, $lte: end },
    tenantId
  });

  if (!record) {
    record = new Attendance({
      tenantId,
      employeeId: employee._id,
      date: new Date(date),
      status: 'Absent'
    });
  }

  if (record.regularization.status === 'Pending') {
    throw { statusCode: 400, code: 'PENDING_REGULARIZATION', message: 'A regularization request is already pending for this date' };
  }

  record.regularization = {
    reason,
    status: 'Pending',
    comments: '',
    requestedPunchIn: requestedPunchIn ? new Date(requestedPunchIn) : null,
    requestedPunchOut: requestedPunchOut ? new Date(requestedPunchOut) : null
  };

  await record.save();

  // Notify manager if manager exists
  if (employee.managerId) {
    const manager = await Employee.findById(employee.managerId).select('userId');
    if (manager) {
      await Notification.create({
        tenantId,
        userId: manager.userId,
        title: 'Attendance Regularization Request',
        content: `${employee.firstName} ${employee.lastName} has requested attendance regularization for ${new Date(date).toLocaleDateString()}`,
        type: 'APPROVAL'
      });
    }
  }

  await writeAuditLog({
    action: 'ATTENDANCE_REGULARIZATION_APPLIED',
    tenantId,
    userId,
    targetId: record._id.toString(),
    meta: { date, reason }
  });

  return record;
};

export const reviewRegularization = async (attendanceId, reviewDetails, tenantId, reviewerId) => {
  const record = await Attendance.findOne({ _id: attendanceId, tenantId }).populate('employeeId');
  if (!record) {
    throw { statusCode: 404, code: 'RECORD_NOT_FOUND', message: 'Attendance record not found' };
  }

  if (record.regularization.status !== 'Pending') {
    throw { statusCode: 400, code: 'INVALID_STATE', message: 'This record does not have a pending regularization request' };
  }

  const { status, comments = '' } = reviewDetails;

  record.regularization.status = status;
  record.regularization.comments = comments;

  if (status === 'Approved') {
    record.isRegularized = true;
    if (record.regularization.requestedPunchIn) {
      record.punchIn = record.regularization.requestedPunchIn;
    }
    if (record.regularization.requestedPunchOut) {
      record.punchOut = record.regularization.requestedPunchOut;
    }

    // Recalculate status and overtime based on regularized times
    const tenant = await Tenant.findById(tenantId);
    const graceMinutes = tenant?.settings?.gracePeriodMinutes || 15;
    const fullDayHours = tenant?.settings?.fullDayHours || 8;

    // Check shift start (using date of punchIn)
    const shiftStart = new Date(record.punchIn);
    shiftStart.setHours(9, 0, 0, 0);

    const diffMinutes = (record.punchIn - shiftStart) / (1000 * 60);
    record.status = diffMinutes > graceMinutes ? 'Late' : 'Present';

    if (record.punchIn && record.punchOut) {
      const hoursWorked = (record.punchOut - record.punchIn) / (1000 * 60 * 60);
      if (hoursWorked > fullDayHours) {
        record.overtimeHours = parseFloat((hoursWorked - fullDayHours).toFixed(2));
      }
      
      const shiftStart = new Date(record.punchIn);
      shiftStart.setHours(9, 0, 0, 0);
      const shiftEnd = new Date(shiftStart.getTime() + (fullDayHours * 60 * 60 * 1000));
      record.isEarlyOut = record.punchOut < shiftEnd;
    }
  }

  await record.save();

  // Notify employee of the decision
  const employeeUser = record.employeeId?.userId;
  if (employeeUser) {
    await Notification.create({
      tenantId,
      userId: employeeUser,
      title: `Regularization Request ${status}`,
      content: `Your attendance regularization request for ${new Date(record.date).toLocaleDateString()} has been ${status.toLowerCase()}`,
      type: 'INFO'
    });
  }

  await writeAuditLog({
    action: `ATTENDANCE_REGULARIZATION_${status.toUpperCase()}`,
    tenantId,
    userId: reviewerId,
    targetId: record._id.toString(),
    meta: { comments }
  });

  return record;
};
