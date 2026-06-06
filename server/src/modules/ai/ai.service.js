import OpenAI from 'openai';
import Employee from '../employees/employee.model.js';
import Attendance from '../attendance/attendance.model.js';
import Leave from '../leave/leave.model.js';
import Performance from '../premium/performance.model.js';

// Initialize the NVIDIA Nemotron client
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
});

const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';

// ─────────────────────────────────────────────────
// Helper: call the AI model (non-streaming)
// ─────────────────────────────────────────────────
async function callAI(systemPrompt, userPrompt) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    top_p: 0.95,
    max_tokens: 4096,
    stream: false
  });
  return completion.choices[0]?.message?.content || '';
}

// ─────────────────────────────────────────────────
// 1. Smart Employee Search (NL directory query)
// ─────────────────────────────────────────────────
export async function smartSearch(tenantId, query) {
  // Pull all employees for this tenant
  const employees = await Employee.find({ tenantId, status: 'Active' })
    .select('firstName lastName email department designation role salary dateOfJoining phone gender employeeId')
    .lean();

  const employeeList = employees.map(e => (
    `ID:${e.employeeId} | ${e.firstName} ${e.lastName} | ${e.email} | Dept:${e.department} | Role:${e.designation} | Salary:${e.salary || 'N/A'} | Joined:${e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : 'N/A'} | Gender:${e.gender || 'N/A'}`
  )).join('\n');

  const systemPrompt = `You are an HR AI assistant for an HRMS platform called HRMS Elite. 
You have access to the employee directory. Answer the user's natural-language query by searching through the employee data provided.
Return results in a clear, formatted manner. If no match, say so.
Always include confidence score (0-100%) for your answer.
Keep response concise but informative.`;

  const userPrompt = `Here is the employee directory:\n${employeeList}\n\nUser query: "${query}"`;

  const response = await callAI(systemPrompt, userPrompt);
  return { query, response, confidence: extractConfidence(response), advisory: true };
}

// ─────────────────────────────────────────────────
// 2. AI Employee Summary
// ─────────────────────────────────────────────────
export async function employeeSummary(tenantId, employeeId) {
  const employee = await Employee.findOne({ tenantId, _id: employeeId }).lean();
  if (!employee) throw new Error('Employee not found');

  // Fetch attendance stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const attendanceRecords = await Attendance.find({
    tenantId,
    employeeId: employee._id,
    date: { $gte: thirtyDaysAgo }
  }).lean();

  const presentDays = attendanceRecords.filter(a => a.status === 'Present').length;
  const lateDays = attendanceRecords.filter(a => a.status === 'Late').length;
  const absentDays = attendanceRecords.filter(a => a.status === 'Absent').length;
  const totalOT = attendanceRecords.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

  // Fetch leave stats
  const leaveRecords = await Leave.find({
    tenantId,
    employeeId: employee._id,
    status: 'Approved'
  }).lean();
  const totalLeaveDays = leaveRecords.reduce((sum, l) => sum + l.totalDays, 0);

  // Fetch performance data
  const perfRecords = await Performance.find({
    tenantId,
    employeeId: employee._id
  }).lean();

  const empData = `
Employee: ${employee.firstName} ${employee.lastName}
Employee ID: ${employee.employeeId}
Email: ${employee.email}
Department: ${employee.department}
Designation: ${employee.designation}
Role Level: ${employee.role}
Salary: ₹${employee.salary || 0}
Date of Joining: ${employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'N/A'}
Gender: ${employee.gender || 'N/A'}
Status: ${employee.status}

Last 30 Days Attendance:
- Present: ${presentDays} days
- Late: ${lateDays} days
- Absent: ${absentDays} days
- Overtime: ${totalOT} hours

Leave History:
- Total Approved Leaves: ${totalLeaveDays} days
- Leave Requests: ${leaveRecords.length}

Performance Reviews: ${perfRecords.length} review cycles
${perfRecords.map(p => `- Cycle: ${p.cycle} | Goals: ${p.goals?.length || 0} | Final Rating: ${p.finalRating || 'Pending'}/5`).join('\n')}
`;

  const systemPrompt = `You are an AI HR analyst for HRMS Elite. Generate a comprehensive, professional employee summary based on the data below.
Include: strengths, areas of concern, attendance patterns, performance trajectory, and recommendations.
Include a confidence score (0-100%) for your analysis.
Format with clear sections and bullet points.
All outputs are ADVISORY only and require human approval.`;

  const response = await callAI(systemPrompt, `Generate an AI summary for this employee:\n${empData}`);
  return {
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeId: employee.employeeId,
    response,
    confidence: extractConfidence(response),
    advisory: true,
    requiresHumanApproval: true
  };
}

// ─────────────────────────────────────────────────
// 3. Workforce Planning & Skill-Gap Analysis
// ─────────────────────────────────────────────────
export async function workforcePlanning(tenantId) {
  const employees = await Employee.find({ tenantId, status: 'Active' })
    .select('firstName lastName department designation salary dateOfJoining role')
    .lean();

  const deptCounts = {};
  const deptSalaries = {};
  let totalSalary = 0;

  employees.forEach(e => {
    deptCounts[e.department] = (deptCounts[e.department] || 0) + 1;
    deptSalaries[e.department] = (deptSalaries[e.department] || 0) + (e.salary || 0);
    totalSalary += (e.salary || 0);
  });

  const deptSummary = Object.keys(deptCounts).map(dept => (
    `${dept}: ${deptCounts[dept]} employees, avg salary ₹${Math.round(deptSalaries[dept] / deptCounts[dept])}`
  )).join('\n');

  const systemPrompt = `You are a strategic HR workforce planner for HRMS Elite. Analyze the workforce composition and provide:
1. Workforce Distribution Analysis
2. Skill Gap Identification (based on roles/designations)
3. Headcount Planning Recommendations
4. Budget Optimization Suggestions
5. Succession Planning Flags
Include confidence scores for each recommendation.
All outputs are ADVISORY only and require human approval for action.`;

  const userPrompt = `Organization has ${employees.length} active employees. Total monthly payroll: ₹${totalSalary}.

Department breakdown:
${deptSummary}

Employee roles distribution:
${employees.map(e => `${e.firstName} ${e.lastName} - ${e.department} - ${e.designation} (${e.role})`).join('\n')}`;

  const response = await callAI(systemPrompt, userPrompt);
  return { totalEmployees: employees.length, totalPayroll: totalSalary, response, confidence: extractConfidence(response), advisory: true };
}

// ─────────────────────────────────────────────────
// 4. Attrition Prediction & Burnout Risk
// ─────────────────────────────────────────────────
export async function attritionPrediction(tenantId) {
  const employees = await Employee.find({ tenantId, status: 'Active' })
    .select('firstName lastName department designation salary dateOfJoining role employeeId')
    .lean();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

  // Gather risk signals per employee
  const riskProfiles = [];

  for (const emp of employees) {
    const attendance = await Attendance.find({
      tenantId,
      employeeId: emp._id,
      date: { $gte: thirtyDaysAgo }
    }).lean();

    const leaves = await Leave.find({
      tenantId,
      employeeId: emp._id,
      status: 'Approved',
      startDate: { $gte: thirtyDaysAgo }
    }).lean();

    const lateDays = attendance.filter(a => a.status === 'Late').length;
    const absentDays = attendance.filter(a => a.status === 'Absent').length;
    const totalOT = attendance.reduce((s, a) => s + (a.overtimeHours || 0), 0);
    const totalLeave = leaves.reduce((s, l) => s + l.totalDays, 0);
    const tenure = Math.round((Date.now() - new Date(emp.dateOfJoining).getTime()) / (1000 * 60 * 60 * 24 * 365) * 10) / 10;

    riskProfiles.push(
      `${emp.firstName} ${emp.lastName} (${emp.employeeId}) | Dept: ${emp.department} | Designation: ${emp.designation} | Tenure: ${tenure}yr | Salary: ₹${emp.salary || 0} | Late(90d): ${lateDays} | Absent(90d): ${absentDays} | OT Hours(90d): ${totalOT} | Leaves(90d): ${totalLeave}`
    );
  }

  const systemPrompt = `You are an AI attrition analyst for HRMS Elite. Analyze each employee's risk profile and:
1. Flag HIGH RISK employees for attrition (with reasons)
2. Flag BURNOUT RISK employees (based on overtime, attendance)
3. Provide overall attrition forecast percentage
4. Recommend retention strategies per employee
5. Assign confidence score (0-100%) for each prediction

Format results as a structured risk report. Mark each employee as LOW / MEDIUM / HIGH risk.
All outputs are ADVISORY only and require human approval.`;

  const response = await callAI(systemPrompt, `Employee risk profiles (last 90 days):\n${riskProfiles.join('\n')}`);
  return { employeesAnalyzed: employees.length, response, confidence: extractConfidence(response), advisory: true };
}

// ─────────────────────────────────────────────────
// 5. Attendance Anomaly Detection
// ─────────────────────────────────────────────────
export async function attendanceAnomalies(tenantId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const records = await Attendance.find({
    tenantId,
    date: { $gte: thirtyDaysAgo }
  }).populate('employeeId', 'firstName lastName employeeId department').lean();

  // Build per-employee anomaly data
  const employeeStats = {};
  records.forEach(r => {
    if (!r.employeeId) return;
    const key = r.employeeId._id.toString();
    if (!employeeStats[key]) {
      employeeStats[key] = {
        name: `${r.employeeId.firstName} ${r.employeeId.lastName}`,
        empId: r.employeeId.employeeId,
        dept: r.employeeId.department,
        present: 0, late: 0, absent: 0, otHours: 0,
        regularizations: 0, unusualPunches: []
      };
    }
    const s = employeeStats[key];
    if (r.status === 'Present') s.present++;
    if (r.status === 'Late') s.late++;
    if (r.status === 'Absent') s.absent++;
    s.otHours += r.overtimeHours || 0;
    if (r.isRegularized) s.regularizations++;

    // Detect unusual punch times
    if (r.punchIn) {
      const hour = new Date(r.punchIn).getHours();
      if (hour < 6 || hour > 12) {
        s.unusualPunches.push(`PunchIn at ${new Date(r.punchIn).toLocaleTimeString()} on ${new Date(r.date).toLocaleDateString()}`);
      }
    }
  });

  const anomalyData = Object.values(employeeStats).map(s => (
    `${s.name} (${s.empId}) [${s.dept}]: Present=${s.present}, Late=${s.late}, Absent=${s.absent}, OT=${s.otHours}hrs, Regularizations=${s.regularizations}${s.unusualPunches.length > 0 ? ` | Unusual: ${s.unusualPunches.join('; ')}` : ''}`
  )).join('\n');

  const systemPrompt = `You are an attendance anomaly detector for HRMS Elite. Analyze the 30-day attendance data and:
1. Flag employees with unusual attendance patterns
2. Detect potential buddy-punching or proxy attendance
3. Identify chronic latecomers and absenteeism patterns
4. Suggest smart regularization recommendations
5. Assign confidence scores for each anomaly detected

Format as a structured anomaly report.
All outputs are ADVISORY only and require human approval.`;

  const response = await callAI(systemPrompt, `Attendance data (last 30 days):\n${anomalyData}`);
  return { recordsAnalyzed: records.length, response, confidence: extractConfidence(response), advisory: true };
}

// ─────────────────────────────────────────────────
// 6. Resume Screening for Recruitment
// ─────────────────────────────────────────────────
export async function screenResume(tenantId, resumeText, jobDescription) {
  const systemPrompt = `You are an AI recruitment assistant for HRMS Elite. Screen the provided resume against the job description and provide:
1. Match Score (0-100%)
2. Key Strengths matching the role
3. Potential Gaps or missing skills
4. Experience Relevance Assessment
5. Culture Fit Indicators
6. Interview Questions to ask this candidate
7. Overall Recommendation: STRONG MATCH / MODERATE MATCH / WEAK MATCH

Include confidence score for your assessment.
All outputs are ADVISORY only and require human approval before making hiring decisions.`;

  const userPrompt = `Job Description:\n${jobDescription}\n\nCandidate Resume:\n${resumeText}`;

  const response = await callAI(systemPrompt, userPrompt);
  return { response, confidence: extractConfidence(response), advisory: true, requiresHumanApproval: true };
}

// ─────────────────────────────────────────────────
// Helper: extract confidence from AI response
// ─────────────────────────────────────────────────
function extractConfidence(text) {
  const match = text.match(/(?:confidence|confidence score)[:\s]*(\d{1,3})%/i);
  return match ? parseInt(match[1]) : 75; // default 75% if not found
}
