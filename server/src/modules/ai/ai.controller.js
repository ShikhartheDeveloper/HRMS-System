import * as aiService from './ai.service.js';
import AIAdvisory from './ai.model.js';
import { writeAuditLog } from '../../utils/auditLogger.js';

export const getAIHistory = async (req, res, next) => {
  try {
    const history = await AIAdvisory.find({ tenantId: req.tenantId })
      .populate('performedBy', 'email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

export const handleSmartSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q?.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required' });
    }

    const result = await aiService.smartSearch(req.tenantId, q.trim());

    const log = await AIAdvisory.create({
      tenantId: req.tenantId,
      type: 'search',
      inputData: { query: q.trim() },
      output: result.response,
      confidence: result.confidence,
      status: 'NotApplicable'
    });

    await writeAuditLog({
      action: 'AI_SMART_SEARCH',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: log._id.toString(),
      meta: { query: q.trim(), confidence: result.confidence }
    });

    res.status(200).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

export const handleEmployeeSummary = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    const result = await aiService.employeeSummary(req.tenantId, employeeId);

    const log = await AIAdvisory.create({
      tenantId: req.tenantId,
      type: 'summary',
      inputData: { employeeId },
      output: result.response,
      confidence: result.confidence,
      status: 'Pending'
    });

    await writeAuditLog({
      action: 'AI_EMPLOYEE_SUMMARY',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: log._id.toString(),
      meta: { employeeId, confidence: result.confidence }
    });

    res.status(200).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

export const handleWorkforcePlanning = async (req, res, next) => {
  try {
    const result = await aiService.workforcePlanning(req.tenantId);

    const log = await AIAdvisory.create({
      tenantId: req.tenantId,
      type: 'workforce',
      inputData: {},
      output: result.response,
      confidence: result.confidence,
      status: 'NotApplicable'
    });

    await writeAuditLog({
      action: 'AI_WORKFORCE_PLANNING',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: log._id.toString(),
      meta: { confidence: result.confidence }
    });

    res.status(200).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

export const handleAttritionPrediction = async (req, res, next) => {
  try {
    const result = await aiService.attritionPrediction(req.tenantId);

    const log = await AIAdvisory.create({
      tenantId: req.tenantId,
      type: 'attrition',
      inputData: {},
      output: result.response,
      confidence: result.confidence,
      status: 'Pending'
    });

    await writeAuditLog({
      action: 'AI_ATTRITION_PREDICTION',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: log._id.toString(),
      meta: { confidence: result.confidence }
    });

    res.status(200).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

export const handleAttendanceAnomalies = async (req, res, next) => {
  try {
    const result = await aiService.attendanceAnomalies(req.tenantId);

    const log = await AIAdvisory.create({
      tenantId: req.tenantId,
      type: 'attendance',
      inputData: {},
      output: result.response,
      confidence: result.confidence,
      status: 'Pending'
    });

    await writeAuditLog({
      action: 'AI_ATTENDANCE_ANOMALY_DETECTION',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: log._id.toString(),
      meta: { confidence: result.confidence }
    });

    res.status(200).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

export const handleScreenResume = async (req, res, next) => {
  try {
    const { resumeText, jobDescription, candidateName } = req.body;
    if (!resumeText?.trim() || !jobDescription?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Both resumeText and jobDescription are required'
      });
    }

    const result = await aiService.screenResume(req.tenantId, resumeText.trim(), jobDescription.trim());

    const log = await AIAdvisory.create({
      tenantId: req.tenantId,
      type: 'resume',
      inputData: {
        candidateName: candidateName?.trim() || 'Unnamed Candidate',
        resumeSnippet: resumeText.trim().substring(0, 500),
        jobDescriptionSnippet: jobDescription.trim().substring(0, 500)
      },
      output: result.response,
      confidence: result.confidence,
      status: 'Pending'
    });

    await writeAuditLog({
      action: 'AI_RESUME_SCREENING',
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: log._id.toString(),
      meta: { candidateName, confidence: result.confidence }
    });

    res.status(200).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

export const handleActionApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, actionPerformed } = req.body;

    if (!['Approved', 'Dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either Approved or Dismissed'
      });
    }

    const log = await AIAdvisory.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      {
        status,
        actionPerformed: actionPerformed || `Marked as ${status}`,
        performedBy: req.user.id
      },
      { new: true }
    ).populate('performedBy', 'email');

    if (!log) {
      return res.status(404).json({ success: false, message: 'AI Advisory log not found' });
    }

    await writeAuditLog({
      action: `AI_ADVISORY_${status.toUpperCase()}`,
      tenantId: req.tenantId,
      userId: req.user.id,
      targetId: log._id.toString(),
      meta: { type: log.type, actionPerformed }
    });

    res.status(200).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};
