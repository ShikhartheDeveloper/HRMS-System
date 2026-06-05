import Leave from './leave.model.js';
import Employee from '../employees/employee.model.js';
import Notification from '../../models/Notification.model.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { sendEmail } from '../../utils/sendEmail.js';

// Base Leave quotas
const LEAVE_QUOTAS = {
  Casual: 12,
  Sick: 12,
  Earned: 15,
  Unpaid: 999 // Loss of pay
};

// Static holiday calendar (mock dates: MM-DD)
const HOLIDAYS = [
  '01-01', // New Year
  '08-15', // Independence Day
  '12-25'  // Christmas
];

// Calculate number of working days between two dates, excluding weekends and holidays
const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  const curDate = new Date(startDate);
  const end = new Date(endDate);

  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    const monthStr = String(curDate.getMonth() + 1).padStart(2, '0');
    const dateStr = String(curDate.getDate()).padStart(2, '0');
    const formattedDate = `${monthStr}-${dateStr}`;
    const isHoliday = HOLIDAYS.includes(formattedDate);

    if (!isWeekend && !isHoliday) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

export const getLeaveBalances = async (employeeId, tenantId) => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  // Find all approved leaves for the employee in the current year
  const approvedLeaves = await Leave.find({
    employeeId,
    tenantId,
    status: 'Approved',
    startDate: { $gte: startOfYear },
    endDate: { $lte: endOfYear }
  }).lean();

  const usedBalances = { Casual: 0, Sick: 0, Earned: 0, Unpaid: 0 };
  approvedLeaves.forEach(leave => {
    if (usedBalances[leave.leaveType] !== undefined) {
      usedBalances[leave.leaveType] += leave.totalDays;
    }
  });

  const remainingBalances = {
    Casual: Math.max(0, LEAVE_QUOTAS.Casual - usedBalances.Casual),
    Sick: Math.max(0, LEAVE_QUOTAS.Sick - usedBalances.Sick),
    Earned: Math.max(0, LEAVE_QUOTAS.Earned - usedBalances.Earned),
    Unpaid: usedBalances.Unpaid // Shows how many unpaid leaves taken
  };

  return {
    quota: LEAVE_QUOTAS,
    used: usedBalances,
    remaining: remainingBalances
  };
};

export const applyLeave = async (userId, leaveDetails, tenantId) => {
  const employee = await Employee.findOne({ userId, tenantId });
  if (!employee) {
    throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' };
  }

  const { leaveType, startDate, endDate, reason } = leaveDetails;
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check Overlapping Leave
  const overlappingLeave = await Leave.findOne({
    employeeId: employee._id,
    tenantId,
    status: { $in: ['Pending', 'Approved'] },
    $or: [
      { startDate: { $lte: end }, endDate: { $gte: start } }
    ]
  }).lean();

  if (overlappingLeave) {
    throw { statusCode: 400, code: 'LEAVE_OVERLAP', message: 'You have an overlapping leave request during this period' };
  }

  // Calculate total working days
  const totalDays = calculateWorkingDays(start, end);
  if (totalDays === 0) {
    throw { statusCode: 400, code: 'NO_WORKING_DAYS', message: 'The selected period consists entirely of weekends or holidays' };
  }

  // Check balance if not Unpaid
  if (leaveType !== 'Unpaid') {
    const balances = await getLeaveBalances(employee._id, tenantId);
    if (balances.remaining[leaveType] < totalDays) {
      throw {
        statusCode: 400,
        code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient leave balance for ${leaveType}. Available: ${balances.remaining[leaveType]} days, Requested: ${totalDays} days`
      };
    }
  }

  const newLeave = await Leave.create({
    tenantId,
    employeeId: employee._id,
    leaveType,
    startDate: start,
    endDate: end,
    totalDays,
    reason,
    status: 'Pending'
  });

  // Notify Manager (or fall back to all HR_ADMINs if no manager assigned)
  if (employee.managerId) {
    const manager = await Employee.findById(employee.managerId).select('userId email');
    if (manager) {
      await Notification.create({
        tenantId,
        userId: manager.userId,
        title: 'New Leave Application',
        content: `${employee.firstName} ${employee.lastName} has applied for ${totalDays} day(s) of ${leaveType} leave.`,
        type: 'APPROVAL'
      });

      if (manager.email) {
        await sendEmail({
          to: manager.email,
          subject: `Leave Request: ${employee.firstName} ${employee.lastName}`,
          text: `Hello,\n\n${employee.firstName} ${employee.lastName} has requested ${totalDays} day(s) of ${leaveType} leave starting from ${startDate} to ${endDate}.\n\nReason: ${reason}\n\nPlease review and action this request in the approvals queue.\n\nBest regards,\nHRMS Portal`
        }).catch(err => console.error('Failed to send leave request email to manager:', err));
      }
    }
  } else {
    // No manager assigned — notify all HR_ADMINs in this tenant
    const hrAdmins = await Employee.find({ tenantId, role: 'HR_ADMIN' }).select('userId email');
    for (const admin of hrAdmins) {
      await Notification.create({
        tenantId,
        userId: admin.userId,
        title: 'New Leave Application (No Manager)',
        content: `${employee.firstName} ${employee.lastName} has applied for ${totalDays} day(s) of ${leaveType} leave. This employee has no manager assigned.`,
        type: 'APPROVAL'
      });
    }
  }

  await writeAuditLog({
    action: 'LEAVE_APPLIED',
    tenantId,
    userId,
    targetId: newLeave._id.toString(),
    meta: { leaveType, totalDays, startDate, endDate }
  });

  return newLeave;
};

export const reviewLeave = async (leaveId, reviewDetails, tenantId, reviewerId) => {
  const reviewer = await Employee.findOne({ userId: reviewerId, tenantId });
  if (!reviewer) {
    throw { statusCode: 404, code: 'REVIEWER_NOT_FOUND', message: 'Reviewer employee profile not found' };
  }

  const leave = await Leave.findOne({ _id: leaveId, tenantId }).populate('employeeId');
  if (!leave) {
    throw { statusCode: 404, code: 'LEAVE_NOT_FOUND', message: 'Leave request not found' };
  }

  if (leave.status !== 'Pending') {
    throw { statusCode: 400, code: 'INVALID_LEAVE_STATE', message: 'Only pending leaves can be reviewed' };
  }

  const { status, comments = '' } = reviewDetails;
  leave.status = status;
  leave.comments = comments;
  leave.approvedBy = reviewer._id;

  await leave.save();

  // Notify Employee
  const employeeUser = leave.employeeId?.userId;
  if (employeeUser) {
    await Notification.create({
      tenantId,
      userId: employeeUser,
      title: `Leave Application ${status}`,
      content: `Your leave request for ${leave.totalDays} day(s) of ${leave.leaveType} has been ${status.toLowerCase()}`,
      type: 'INFO'
    });
  }

  if (leave.employeeId?.email) {
    await sendEmail({
      to: leave.employeeId.email,
      subject: `Leave Request: ${status}`,
      text: `Hello ${leave.employeeId.firstName},\n\nYour request for ${leave.totalDays} day(s) of ${leave.leaveType} leave starting on ${new Date(leave.startDate).toLocaleDateString()} has been ${status}.\n\nComments/Remarks: ${comments || 'None'}\n\nBest regards,\nHR Team`
    }).catch(err => console.error('Failed to send leave review email to employee:', err));
  }

  // Audit Log
  await writeAuditLog({
    action: `LEAVE_${status.toUpperCase()}`,
    tenantId,
    userId: reviewerId,
    targetId: leave._id.toString(),
    meta: { comments, leaveType: leave.leaveType, totalDays: leave.totalDays }
  });

  return leave;
};

export const cancelLeave = async (leaveId, tenantId, requesterId) => {
  const employee = await Employee.findOne({ userId: requesterId, tenantId });
  if (!employee) {
    throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' };
  }

  const leave = await Leave.findOne({ _id: leaveId, tenantId });
  if (!leave) {
    throw { statusCode: 404, code: 'LEAVE_NOT_FOUND', message: 'Leave request not found' };
  }

  // Double check authorization (only employee who requested it can cancel)
  if (leave.employeeId.toString() !== employee._id.toString()) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'You cannot cancel another employee\'s leave' };
  }

  if (leave.status === 'Cancelled' || leave.status === 'Rejected') {
    throw { statusCode: 400, code: 'INVALID_STATE', message: 'This leave request is already cancelled or rejected' };
  }

  leave.status = 'Cancelled';
  await leave.save();

  // Notify Manager if it was already approved
  if (employee.managerId) {
    const manager = await Employee.findById(employee.managerId).select('userId email');
    if (manager) {
      await Notification.create({
        tenantId,
        userId: manager.userId,
        title: 'Leave Application Cancelled',
        content: `${employee.firstName} ${employee.lastName} has cancelled their leave request of ${leave.totalDays} day(s).`,
        type: 'INFO'
      });

      if (manager.email) {
        await sendEmail({
          to: manager.email,
          subject: `Leave Cancelled: ${employee.firstName} ${employee.lastName}`,
          text: `Hello,\n\n${employee.firstName} ${employee.lastName} has cancelled their leave request of ${leave.totalDays} day(s).\n\nBest regards,\nHRMS Portal`
        }).catch(err => console.error('Failed to send leave cancellation email to manager:', err));
      }
    }
  }

  await writeAuditLog({
    action: 'LEAVE_CANCELLED',
    tenantId,
    userId: requesterId,
    targetId: leave._id.toString()
  });

  return leave;
};
