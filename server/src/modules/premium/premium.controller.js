import Payroll from './payroll.model.js';
import Performance from './performance.model.js';
import { Job, Candidate } from './recruitment.model.js';
import Onboarding from './onboarding.model.js';
import Expense from './expense.model.js';
import { Course, TrainingProgress } from './training.model.js';
import Asset from './asset.model.js';
import Ticket from './ticket.model.js';
import Employee from '../employees/employee.model.js';
import Leave from '../leave/leave.model.js';
import { uploadJobImage, resolveJobImageUrl } from '../../utils/uploadJobImage.js';
import { uploadToStorage, resolveStorageUrl } from '../../utils/uploadStorage.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { notifyAllTenantUsers } from '../../utils/notifyTenantUsers.js';

// ==========================================
// 1. PAYROLL SECTION
// ==========================================
export const getPayroll = async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.user.role === 'EMPLOYEE') {
      query.employeeId = req.user.employeeId;
    }
    const records = await Payroll.find(query).populate('employeeId', 'firstName lastName email');
    res.status(200).json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

export const runPayroll = async (req, res, next) => {
  try {
    const { month } = req.body; // YYYY-MM
    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }

    // Get all employees in the tenant
    const employees = await Employee.find({ tenantId: req.tenantId, status: 'Active' });
    const payrollRecords = [];

    for (const emp of employees) {
      // Calculate LOP Days from leave model for the specific month
      const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

      const approvedLeaves = await Leave.find({
        tenantId: req.tenantId,
        employeeId: emp._id,
        status: 'Approved',
        startDate: { $gte: startOfMonth },
        endDate: { $lte: endOfMonth }
      });

      let lopDays = 0;
      approvedLeaves.forEach(lv => {
        if (lv.leaveType === 'Unpaid') {
          lopDays += lv.totalDays;
        }
      });

      const base = emp.salary || 50000;
      const dailyRate = base / 30;
      const lopDeduction = Math.round(lopDays * dailyRate);
      
      const hra = Math.round(base * 0.4);
      const specialAllowance = Math.round(base * 0.1);
      
      // Statutory deductions
      const pf = Math.round(base * 0.12);
      const esi = Math.round(base * 0.0075);
      const tds = Math.round(base * 0.10);
      const pt = 200;

      const netSalary = (base + hra + specialAllowance) - (pf + esi + tds + pt + lopDeduction);

      // Upsert payroll record
      const record = await Payroll.findOneAndUpdate(
        { tenantId: req.tenantId, employeeId: emp._id, month },
        {
          baseSalary: base,
          earnings: { hra, specialAllowance, reimbursement: 0 },
          deductions: { pf, esi, tds, pt, lopDeduction },
          lopDays,
          netSalary,
          status: 'Draft',
          bankName: 'Global Bank',
          accountNumber: '1234567890',
          ifscCode: 'GLOB000123'
        },
        { upsert: true, new: true }
      );
      payrollRecords.push(record);
    }

    res.status(200).json({ success: true, data: payrollRecords });
  } catch (err) {
    next(err);
  }
};

export const payPayroll = async (req, res, next) => {
  try {
    const record = await Payroll.findOneAndUpdate(
      { tenantId: req.tenantId, _id: req.params.id },
      { status: 'Paid' },
      { new: true }
    );
    res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. PERFORMANCE SECTION
// ==========================================
const resolveTargetEmployee = async (tenantId, employeeId, requester) => {
  if (!employeeId) {
    throw { statusCode: 400, code: 'BAD_REQUEST', message: 'Employee is required' };
  }

  const targetEmployee = await Employee.findOne({ _id: employeeId, tenantId }).lean();
  if (!targetEmployee) {
    throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found in your organization' };
  }

  if (requester.role === 'EMPLOYEE' && requester.employeeId?.toString() !== employeeId.toString()) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'You can only manage your own performance records' };
  }

  if (requester.role === 'MANAGER') {
    const managerProfile = await Employee.findOne({ userId: requester.id, tenantId }).select('_id').lean();
    const isSelf = requester.employeeId?.toString() === employeeId.toString();
    const isDirectReport = managerProfile && targetEmployee.managerId?.toString() === managerProfile._id.toString();
    if (!isSelf && !isDirectReport) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Managers can only manage goals and reviews for their direct reports' };
    }
  }

  return targetEmployee;
};

export const getPerformance = async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };

    if (req.user.role === 'EMPLOYEE') {
      if (!req.user.employeeId) {
        return res.status(200).json({ success: true, data: [] });
      }
      query.employeeId = req.user.employeeId;
    } else if (req.user.role === 'MANAGER') {
      const managerProfile = await Employee.findOne({ userId: req.user.id, tenantId: req.tenantId }).select('_id').lean();
      const reportIds = managerProfile
        ? (await Employee.find({ tenantId: req.tenantId, managerId: managerProfile._id }).select('_id').lean()).map((e) => e._id)
        : [];
      const visibleIds = [...reportIds, ...(req.user.employeeId ? [req.user.employeeId] : [])];
      query.employeeId = { $in: visibleIds };
    }

    const records = await Performance.find(query)
      .populate('employeeId', 'firstName lastName department designation')
      .populate('reviews.reviewerId', 'firstName lastName')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

export const addGoal = async (req, res, next) => {
  try {
    const { employeeId, title, target, cycle } = req.body;

    if (!title?.trim() || !cycle?.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Goal title and evaluation cycle are required' }
      });
    }

    await resolveTargetEmployee(req.tenantId, employeeId, req.user);

    const goalObj = {
      title: title.trim(),
      target: target?.trim() || '',
      progress: 0,
      status: 'Not Started',
      createdBy: req.user.id,
      createdAt: new Date()
    };

    let record = await Performance.findOne({ tenantId: req.tenantId, employeeId, cycle: cycle.trim() });

    if (record) {
      record.goals.push(goalObj);
      await record.save();
    } else {
      record = await Performance.create({
        tenantId: req.tenantId,
        employeeId,
        cycle: cycle.trim(),
        goals: [goalObj],
        createdBy: req.user.id
      });
    }

    record = await Performance.findById(record._id).populate('employeeId', 'firstName lastName department designation');

    await writeAuditLog({
      action: 'PERFORMANCE_GOAL_ADDED',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: record._id.toString(),
      meta: { employeeId, title: goalObj.title, cycle: cycle.trim() }
    });

    res.status(200).json({ success: true, message: 'Goal added successfully', data: record });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message }
      });
    }
    next(err);
  }
};

export const submitReview = async (req, res, next) => {
  try {
    const { employeeId, cycle, reviewerRole, rating, feedback } = req.body;

    if (!cycle?.trim() || !reviewerRole || rating == null || !feedback?.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Cycle, reviewer role, rating, and feedback are required' }
      });
    }

    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Rating must be between 1 and 5' }
      });
    }

    await resolveTargetEmployee(req.tenantId, employeeId, req.user);

    const reviewObj = {
      reviewerId: req.user.employeeId || null,
      reviewerUserId: req.user.id,
      reviewerRole,
      rating: numericRating,
      feedback: feedback.trim(),
      submittedAt: new Date()
    };

    let record = await Performance.findOne({ tenantId: req.tenantId, employeeId, cycle: cycle.trim() });

    if (record) {
      record.reviews.push(reviewObj);
      const allRatings = record.reviews.map((r) => r.rating);
      record.finalRating = Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10;
      await record.save();
    } else {
      record = await Performance.create({
        tenantId: req.tenantId,
        employeeId,
        cycle: cycle.trim(),
        reviews: [reviewObj],
        finalRating: numericRating,
        createdBy: req.user.id
      });
    }

    record = await Performance.findById(record._id)
      .populate('employeeId', 'firstName lastName department designation')
      .populate('reviews.reviewerId', 'firstName lastName');

    await writeAuditLog({
      action: 'PERFORMANCE_REVIEW_SUBMITTED',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: record._id.toString(),
      meta: { employeeId, reviewerRole, rating: numericRating, cycle: cycle.trim() }
    });

    res.status(200).json({ success: true, message: 'Review submitted successfully', data: record });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message }
      });
    }
    next(err);
  }
};

// ==========================================
// 3. RECRUITMENT SECTION
// ==========================================
export const getJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ tenantId: req.tenantId })
      .populate('postedBy', 'email role')
      .populate('postedByEmployeeId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const jobsWithImages = await Promise.all(
      jobs.map(async (job) => ({
        ...job,
        imageUrl: await resolveJobImageUrl(job.imageUrl)
      }))
    );

    res.status(200).json({ success: true, data: jobsWithImages });
  } catch (err) {
    next(err);
  }
};

export const createJob = async (req, res, next) => {
  try {
    const { title, department, description, location, employmentType } = req.body;

    if (!title?.trim() || !department?.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Title and department are required' }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Job image is required' }
      });
    }

    if (!req.tenantId) {
      return res.status(403).json({
        success: false,
        error: { code: 'TENANT_CONTEXT_MISSING', message: 'Tenant context is required to save job postings' }
      });
    }

    const imageUrl = await uploadJobImage(req.file, req.tenantId);

    const job = await Job.create({
      tenantId: req.tenantId,
      title: title.trim(),
      department: department.trim(),
      description: description?.trim() || '',
      location: location?.trim() || 'Remote',
      employmentType: employmentType || 'Full-time',
      status: 'Open',
      imageUrl,
      imageOriginalName: req.file.originalname,
      imageMimeType: req.file.mimetype,
      postedBy: req.user.id,
      postedByEmployeeId: req.user.employeeId || null
    });

    await writeAuditLog({
      action: 'JOB_POSTED',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: job._id.toString(),
      meta: {
        title: job.title,
        department: job.department,
        location: job.location,
        employmentType: job.employmentType
      }
    });

    const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const notificationContent = `New opening: "${job.title}" in ${job.department} (${job.location}). Open Recruitment to view details.`;

    let broadcastResult = { usersNotified: 0, emailsSent: 0, emailsFailed: 0, totalUsers: 0 };
    try {
      broadcastResult = await notifyAllTenantUsers({
        tenantId: req.tenantId,
        title: 'New Job Opening Posted',
        content: notificationContent,
        type: 'INFO',
        buildEmail: ({ firstName }) => ({
          subject: `New Job Opening: ${job.title}`,
          text: [
            `Hello ${firstName},`,
            '',
            'A new job opening has been posted in your organization:',
            '',
            `Title: ${job.title}`,
            `Department: ${job.department}`,
            `Location: ${job.location}`,
            `Type: ${job.employmentType}`,
            '',
            job.description || 'See the HRMS Recruitment page for full details.',
            '',
            `View in app: ${appUrl}/recruitment`,
            '',
            'Best regards,',
            'HRMS Team'
          ].join('\n'),
          html: `
            <p>Hello ${firstName},</p>
            <p>A new job opening has been posted in your organization:</p>
            <ul>
              <li><strong>Title:</strong> ${job.title}</li>
              <li><strong>Department:</strong> ${job.department}</li>
              <li><strong>Location:</strong> ${job.location}</li>
              <li><strong>Type:</strong> ${job.employmentType}</li>
            </ul>
            <p>${job.description || 'See the HRMS Recruitment page for full details.'}</p>
            <p><a href="${appUrl}/recruitment">View job in HRMS</a></p>
            <p>Best regards,<br/>HRMS Team</p>
          `
        })
      });

      await writeAuditLog({
        action: 'JOB_BROADCAST_SENT',
        tenantId: req.tenantId,
        userId: req.user.id,
        targetId: job._id.toString(),
        meta: broadcastResult
      });
    } catch (notifyErr) {
      console.error('Job saved but notification/email broadcast failed:', notifyErr.message);
    }

    const savedJob = await Job.findById(job._id)
      .populate('postedBy', 'email role')
      .populate('postedByEmployeeId', 'firstName lastName')
      .lean();

    const resolvedImageUrl = await resolveJobImageUrl(savedJob.imageUrl);

    res.status(201).json({
      success: true,
      message: `Job saved. Notified ${broadcastResult.usersNotified} user(s) in-app and sent ${broadcastResult.emailsSent} email(s).`,
      data: { ...savedJob, imageUrl: resolvedImageUrl },
      broadcast: broadcastResult
    });
  } catch (err) {
    next(err);
  }
};

export const getCandidates = async (req, res, next) => {
  try {
    const candidates = await Candidate.find({ tenantId: req.tenantId }).populate('jobId');
    res.status(200).json({ success: true, data: candidates });
  } catch (err) {
    next(err);
  }
};

export const createCandidate = async (req, res, next) => {
  try {
    const payload = { ...req.body, tenantId: req.tenantId };
    const candidate = await Candidate.create(payload);
    res.status(201).json({ success: true, data: candidate });
  } catch (err) {
    next(err);
  }
};

export const updateCandidateStage = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOneAndUpdate(
      { tenantId: req.tenantId, _id: req.params.id },
      { stage: req.body.stage },
      { new: true }
    );
    res.status(200).json({ success: true, data: candidate });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. ONBOARDING SECTION
// ==========================================
const mapOnboardingDocuments = async (records) => {
  return Promise.all(
    records.map(async (record) => {
      const plain = record.toObject ? record.toObject() : record;
      if (!plain.documents?.length) return plain;

      plain.documents = await Promise.all(
        plain.documents.map(async (doc) => ({
          ...doc,
          signedUrl: await resolveStorageUrl(doc.s3Key || doc.fileUrl)
        }))
      );
      return plain;
    })
  );
};

export const getOnboarding = async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.user.role === 'EMPLOYEE') {
      if (!req.user.employeeId) {
        return res.status(200).json({ success: true, data: [] });
      }
      query.employeeId = req.user.employeeId;
    }
    const records = await Onboarding.find(query)
      .populate('employeeId', 'firstName lastName department')
      .sort({ updatedAt: -1 });

    const data = await mapOnboardingDocuments(records);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const uploadOnboardingDocument = async (req, res, next) => {
  try {
    const { employeeId, name, expiryDate } = req.body;

    if (!employeeId || !name?.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Employee and document name are required' }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No document file was provided' }
      });
    }

    const employee = await Employee.findOne({ _id: employeeId, tenantId: req.tenantId }).lean();
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found in your organization' }
      });
    }

    const { storageKey } = await uploadToStorage(
      req.file,
      `${req.tenantId}/onboarding/${employee._id}`
    );

    const documentEntry = {
      name: name.trim(),
      s3Key: storageKey,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    };

    let record = await Onboarding.findOne({ tenantId: req.tenantId, employeeId: employee._id });

    if (record) {
      record.documents.push(documentEntry);
      await record.save();
    } else {
      record = await Onboarding.create({
        tenantId: req.tenantId,
        employeeId: employee._id,
        tasks: [],
        policySignOffs: [],
        documents: [documentEntry]
      });
    }

    await writeAuditLog({
      action: 'ONBOARDING_DOCUMENT_UPLOADED',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: record._id.toString(),
      meta: {
        employeeId: employee._id.toString(),
        documentName: documentEntry.name,
        s3Key: storageKey,
        originalName: req.file.originalname
      }
    });

    const populated = await Onboarding.findById(record._id)
      .populate('employeeId', 'firstName lastName department');

    const [mapped] = await mapOnboardingDocuments([populated]);
    const uploadedDoc = mapped.documents[mapped.documents.length - 1];

    res.status(201).json({
      success: true,
      message: 'Document uploaded and saved successfully',
      data: { onboarding: mapped, document: uploadedDoc }
    });
  } catch (err) {
    next(err);
  }
};

export const updateOnboardingTask = async (req, res, next) => {
  try {
    const { taskId, completed } = req.body;
    const record = await Onboarding.findOneAndUpdate(
      { tenantId: req.tenantId, _id: req.params.id, 'tasks._id': taskId },
      {
        $set: {
          'tasks.$.completed': completed,
          'tasks.$.completedAt': completed ? new Date() : null
        }
      },
      { new: true }
    );
    res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 5. EXPENSE SECTION
// ==========================================
export const getExpenses = async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.user.role === 'EMPLOYEE') {
      query.employeeId = req.user.employeeId;
    }
    const expenses = await Expense.find(query).populate('employeeId', 'firstName lastName');
    res.status(200).json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      tenantId: req.tenantId,
      employeeId: req.user.employeeId
    };
    const expense = await Expense.create(payload);
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

export const approveExpense = async (req, res, next) => {
  try {
    const { status, comments } = req.body;
    const expense = await Expense.findOneAndUpdate(
      { tenantId: req.tenantId, _id: req.params.id },
      {
        status,
        $push: {
          approvalHistory: {
            approverId: req.user.employeeId,
            action: status === 'Approved' ? 'Approve' : 'Reject',
            comments
          }
        }
      },
      { new: true }
    );
    res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 6. TRAINING / L&D SECTION
// ==========================================
export const getCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
};

export const createCourse = async (req, res, next) => {
  try {
    const course = await Course.create({
      ...req.body,
      tenantId: req.tenantId,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

export const getTrainingProgress = async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.user.role === 'EMPLOYEE') {
      query.employeeId = req.user.employeeId;
    }
    const progress = await TrainingProgress.find(query)
      .populate('employeeId', 'firstName lastName')
      .populate('courseId');
    res.status(200).json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

export const enrollCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const progress = await TrainingProgress.create({
      tenantId: req.tenantId,
      employeeId: req.user.employeeId,
      courseId,
      status: 'Enrolled',
      progressPercent: 0
    });
    res.status(201).json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 7. ASSET SECTION
// ==========================================
export const getAssets = async (req, res, next) => {
  try {
    const assets = await Asset.find({ tenantId: req.tenantId }).populate('currentEmployeeId', 'firstName lastName');
    res.status(200).json({ success: true, data: assets });
  } catch (err) {
    next(err);
  }
};

export const createAsset = async (req, res, next) => {
  try {
    const payload = { ...req.body, tenantId: req.tenantId };
    const asset = await Asset.create(payload);
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
};

export const allocateAsset = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const asset = await Asset.findOneAndUpdate(
      { tenantId: req.tenantId, _id: req.params.id },
      { currentEmployeeId: employeeId || null, status: employeeId ? 'Allocated' : 'Available' },
      { new: true }
    );
    res.status(200).json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 8. TICKET SECTION
// ==========================================
export const getTickets = async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.user.role === 'EMPLOYEE') {
      query.employeeId = req.user.employeeId;
    }
    const tickets = await Ticket.find(query)
      .populate('employeeId', 'firstName lastName')
      .populate('assignedEmployeeId', 'firstName lastName');
    res.status(200).json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
};

export const createTicket = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      tenantId: req.tenantId,
      employeeId: req.user.employeeId,
      slaDueDate: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h SLA
    };
    const ticket = await Ticket.create(payload);
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

export const resolveTicket = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const ticket = await Ticket.findOneAndUpdate(
      { tenantId: req.tenantId, _id: req.params.id },
      { status: 'Resolved', resolutionNotes },
      { new: true }
    );
    res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};
