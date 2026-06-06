import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Employee from '../employees/employee.model.js';
import Attendance from '../attendance/attendance.model.js';
import Leave from '../leave/leave.model.js';
import ReportJob from './report.model.js';
import Payroll from '../premium/payroll.model.js';

export const getHeadcountStats = async (tenantId) => {
  const activeCount = await Employee.countDocuments({ tenantId, status: 'Active' });
  const terminatedCount = await Employee.countDocuments({ tenantId, status: 'Terminated' });

  const tId = typeof tenantId === 'string' ? new mongoose.Types.ObjectId(tenantId) : tenantId;

  // Breakdown by department
  const deptBreakdown = await Employee.aggregate([
    { $match: { tenantId: tId, status: 'Active', isDeleted: { $ne: true } } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $project: { department: '$_id', count: 1, _id: 0 } }
  ]);

  return {
    totalActive: activeCount,
    totalTerminated: terminatedCount,
    departmentDistribution: deptBreakdown
  };
};

export const getAttendanceSummary = async (tenantId) => {
  // Check attendance counts for today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const present = await Attendance.countDocuments({
    tenantId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'Present'
  });

  const late = await Attendance.countDocuments({
    tenantId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'Late'
  });

  const onLeave = await Attendance.countDocuments({
    tenantId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'On Leave'
  });

  // Calculate absents: total active employees minus present, late, on leave
  const activeCount = await Employee.countDocuments({ tenantId, status: 'Active' });
  const markedCount = present + late + onLeave;
  const absent = Math.max(0, activeCount - markedCount);

  return {
    present,
    late,
    onLeave,
    absent,
    totalActive: activeCount
  };
};

export const getLeaveUsage = async (tenantId) => {
  const currentYear = new Date().getFullYear();
  const start = new Date(currentYear, 0, 1);
  const end = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const tId = typeof tenantId === 'string' ? new mongoose.Types.ObjectId(tenantId) : tenantId;

  const leaveCounts = await Leave.aggregate([
    {
      $match: {
        tenantId: tId,
        status: 'Approved',
        startDate: { $gte: start },
        endDate: { $lte: end },
        isDeleted: { $ne: true }
      }
    },
    { $group: { _id: '$leaveType', totalDays: { $sum: '$totalDays' }, count: { $sum: 1 } } },
    { $project: { leaveType: '$_id', totalDays: 1, count: 1, _id: 0 } }
  ]);

  return leaveCounts;
};

export const getSalaryFlowStats = async (tenantId) => {
  const tId = typeof tenantId === 'string' ? new mongoose.Types.ObjectId(tenantId) : tenantId;

  // Aggregate paid or processed payroll runs to reflect actual salary flow
  const payrollCount = await Payroll.countDocuments({ tenantId });

  let totalSalary = 0;
  let averageSalary = 0;
  let deptSalaryBreakdown = [];

  if (payrollCount > 0) {
    const payrolls = await Payroll.find({ tenantId }).populate('employeeId').lean();
    totalSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    averageSalary = payrolls.length > 0 ? parseFloat((totalSalary / payrolls.length).toFixed(2)) : 0;

    const deptMap = {};
    payrolls.forEach(p => {
      if (p.employeeId) {
        const dept = p.employeeId.department || 'Other';
        if (!deptMap[dept]) {
          deptMap[dept] = { totalSalary: 0, count: 0 };
        }
        deptMap[dept].totalSalary += (p.netSalary || 0);
        deptMap[dept].count += 1;
      }
    });

    deptSalaryBreakdown = Object.keys(deptMap).map(dept => ({
      department: dept,
      totalSalary: deptMap[dept].totalSalary,
      count: deptMap[dept].count
    }));
  } else {
    // Fallback: active employee contract salary CTC
    const employees = await Employee.find({ tenantId, status: 'Active', isDeleted: { $ne: true } }).lean();
    totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
    averageSalary = employees.length > 0 ? parseFloat((totalSalary / employees.length).toFixed(2)) : 0;

    const deptBreakdown = await Employee.aggregate([
      { $match: { tenantId: tId, status: 'Active', isDeleted: { $ne: true } } },
      { $group: { _id: '$department', totalSalary: { $sum: '$salary' }, count: { $sum: 1 } } },
      { $project: { department: '$_id', totalSalary: 1, count: 1, _id: 0 } }
    ]);

    deptSalaryBreakdown = deptBreakdown;
  }

  return {
    totalSalary,
    averageSalary,
    departmentSalaryDistribution: deptSalaryBreakdown
  };
};

export const getAttritionStats = async (tenantId) => {
  const active = await Employee.countDocuments({ tenantId, status: 'Active' });
  const terminated = await Employee.countDocuments({ tenantId, status: 'Terminated' });

  const total = active + terminated;
  const attritionRate = total > 0 ? parseFloat(((terminated / total) * 100).toFixed(2)) : 0;

  return {
    active,
    terminated,
    attritionRate
  };
};

// Asynchronous worker function to build reports and export to CSV
const processExportJob = async (jobId, type, tenantId) => {
  try {
    await ReportJob.findByIdAndUpdate(jobId, { status: 'Processing' });

    let csvContent = '';
    let fileName = `${type}-${jobId}.csv`;
    
    // Resolve absolute path to exports folder
    const exportsDir = path.join(process.cwd(), 'public', 'exports');
    await fs.promises.mkdir(exportsDir, { recursive: true });
    const filePath = path.join(exportsDir, fileName);

    if (type === 'headcount') {
      const employees = await Employee.find({ tenantId }).populate('managerId', 'firstName lastName employeeId').lean();
      csvContent = 'Employee ID,First Name,Last Name,Email,Phone,Date of Birth,Gender,Department,Designation,Role Level,Date of Joining,Manager Name,Manager Employee ID,Status,Salary,Created At\n';
      employees.forEach(e => {
        const mgrName = e.managerId ? `${e.managerId.firstName} ${e.managerId.lastName}` : 'N/A';
        const mgrEmpId = e.managerId ? e.managerId.employeeId : 'N/A';
        csvContent += `"${e.employeeId}","${e.firstName}","${e.lastName}","${e.email}","${e.phone || ''}","${e.dateOfBirth ? new Date(e.dateOfBirth).toLocaleDateString() : ''}","${e.gender || ''}","${e.department}","${e.designation}","${e.role}","${e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : ''}","${mgrName}","${mgrEmpId}","${e.status}",${e.salary || 0},"${new Date(e.createdAt).toLocaleDateString()}"\n`;
      });
    } else if (type === 'attendance-summary') {
      const records = await Attendance.find({ tenantId }).populate('employeeId').lean();
      csvContent = 'Date,Employee ID,Employee Name,Punch In,Punch Out,Status,Overtime Hours\n';
      records.forEach(r => {
        const name = r.employeeId ? `"${r.employeeId.firstName} ${r.employeeId.lastName}"` : '"N/A"';
        const empId = r.employeeId ? `"${r.employeeId.employeeId}"` : '"N/A"';
        csvContent += `"${new Date(r.date).toLocaleDateString()}",${empId},${name},"${r.punchIn ? new Date(r.punchIn).toLocaleTimeString() : ''}","${r.punchOut ? new Date(r.punchOut).toLocaleTimeString() : ''}","${r.status}",${r.overtimeHours}\n`;
      });
    } else if (type === 'leave-usage') {
      const leaves = await Leave.find({ tenantId }).populate('employeeId').lean();
      csvContent = 'Employee ID,Employee Name,Leave Type,Start Date,End Date,Total Days,Status,Reason\n';
      leaves.forEach(l => {
        const name = l.employeeId ? `"${l.employeeId.firstName} ${l.employeeId.lastName}"` : '"N/A"';
        const empId = l.employeeId ? `"${l.employeeId.employeeId}"` : '"N/A"';
        csvContent += `${empId},${name},"${l.leaveType}","${new Date(l.startDate).toLocaleDateString()}","${new Date(l.endDate).toLocaleDateString()}",${l.totalDays},"${l.status}","${l.reason}"\n`;
      });
    } else if (type === 'attrition') {
      const employees = await Employee.find({ tenantId, status: 'Terminated' }).lean();
      csvContent = 'Employee ID,Name,Email,Department,Designation,Date of Joining\n';
      employees.forEach(e => {
        csvContent += `"${e.employeeId}","${e.firstName} ${e.lastName}","${e.email}","${e.department}","${e.designation}","${e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : ''}"\n`;
      });
    } else if (type === 'salary-flow') {
      const payrollCount = await Payroll.countDocuments({ tenantId });
      if (payrollCount > 0) {
        const payrolls = await Payroll.find({ tenantId }).populate('employeeId').lean();
        csvContent = 'Month,Employee ID,First Name,Last Name,Department,Designation,Base Salary,Net Salary,Status\n';
        payrolls.forEach(p => {
          const emp = p.employeeId || {};
          csvContent += `"${p.month}","${emp.employeeId || 'N/A'}","${emp.firstName || ''}","${emp.lastName || ''}","${emp.department || ''}","${emp.designation || ''}",${p.baseSalary},${p.netSalary},"${p.status}"\n`;
        });
      } else {
        const employees = await Employee.find({ tenantId, status: 'Active' }).lean();
        csvContent = 'Employee ID,First Name,Last Name,Department,Designation,Contract Salary\n';
        employees.forEach(e => {
          csvContent += `"${e.employeeId}","${e.firstName}","${e.lastName}","${e.department}","${e.designation}",${e.salary || 0}\n`;
        });
      }
    }

    await fs.promises.writeFile(filePath, csvContent);

    // Update status to Completed and point to file download url
    // Point URL to backend static file — uses SERVER_BASE_URL in production
    const serverBase = process.env.SERVER_BASE_URL || 'http://localhost:5000';
    const resultUrl = `${serverBase}/exports/${fileName}`;
    await ReportJob.findByIdAndUpdate(jobId, { status: 'Completed', resultUrl });
  } catch (err) {
    console.error('Report export error:', err);
    await ReportJob.findByIdAndUpdate(jobId, { status: 'Failed', error: err.message });
  }
};

export const triggerExport = async (type, tenantId) => {
  const job = await ReportJob.create({
    tenantId,
    type,
    status: 'Pending'
  });

  // Start background compile process immediately
  setImmediate(() => {
    processExportJob(job._id, type, tenantId);
  });

  return job;
};
