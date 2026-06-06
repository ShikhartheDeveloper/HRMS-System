import fs from 'fs';
import path from 'path';
import Employee from '../employees/employee.model.js';
import Attendance from '../attendance/attendance.model.js';
import Leave from '../leave/leave.model.js';
import ReportJob from './report.model.js';

export const getHeadcountStats = async (tenantId) => {
  const activeCount = await Employee.countDocuments({ tenantId, status: 'Active' });
  const terminatedCount = await Employee.countDocuments({ tenantId, status: 'Terminated' });

  // Breakdown by department
  const deptBreakdown = await Employee.aggregate([
    { $match: { tenantId, status: 'Active', isDeleted: { $ne: true } } },
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

  const leaveCounts = await Leave.aggregate([
    {
      $match: {
        tenantId,
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
  const employees = await Employee.find({ tenantId, status: 'Active', isDeleted: { $ne: true } }).lean();
  const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  const averageSalary = employees.length > 0 ? parseFloat((totalSalary / employees.length).toFixed(2)) : 0;

  const deptSalaryBreakdown = await Employee.aggregate([
    { $match: { tenantId, status: 'Active', isDeleted: { $ne: true } } },
    { $group: { _id: '$department', totalSalary: { $sum: '$salary' }, count: { $sum: 1 } } },
    { $project: { department: '$_id', totalSalary: 1, count: 1, _id: 0 } }
  ]);

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
      const employees = await Employee.find({ tenantId }).lean();
      csvContent = 'Employee ID,First Name,Last Name,Email,Department,Designation,Status,Date of Joining\n';
      employees.forEach(e => {
        csvContent += `"${e.employeeId}","${e.firstName}","${e.lastName}","${e.email}","${e.department}","${e.designation}","${e.status}","${e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : ''}"\n`;
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
      const employees = await Employee.find({ tenantId, status: 'Active' }).lean();
      csvContent = 'Employee ID,First Name,Last Name,Department,Designation,Salary\n';
      employees.forEach(e => {
        csvContent += `"${e.employeeId}","${e.firstName}","${e.lastName}","${e.department}","${e.designation}",${e.salary || 0}\n`;
      });
    }

    await fs.promises.writeFile(filePath, csvContent);

    // Update status to Completed and point to file download url
    // In dev, client is at port 5173, backend at 5000. So we point URL to backend port static file
    const resultUrl = `http://localhost:5000/exports/${fileName}`;
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
