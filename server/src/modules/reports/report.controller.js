import * as reportService from './report.service.js';
import ReportJob from './report.model.js';

export const getHeadcount = async (req, res, next) => {
  try {
    const stats = await reportService.getHeadcountStats(req.user.tenantId);
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    const stats = await reportService.getAttendanceSummary(req.user.tenantId);
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaves = async (req, res, next) => {
  try {
    const stats = await reportService.getLeaveUsage(req.user.tenantId);
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getAttrition = async (req, res, next) => {
  try {
    const stats = await reportService.getAttritionStats(req.user.tenantId);
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getSalaryFlows = async (req, res, next) => {
  try {
    const stats = await reportService.getSalaryFlowStats(req.user.tenantId);
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    const { type } = req.body;
    if (!type || !['headcount', 'attendance-summary', 'leave-usage', 'attrition', 'salary-flow'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid or missing report type for export' }
      });
    }

    const job = await reportService.triggerExport(type, req.user.tenantId);
    
    res.status(202).json({
      success: true,
      message: 'Report export job initiated in background',
      data: {
        jobId: job._id,
        status: job.status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getExportStatus = async (req, res, next) => {
  try {
    const job = await ReportJob.findOne(req.scopeQuery({ _id: req.params.jobId }));
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'JOB_NOT_FOUND', message: 'Report export job not found' }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: job._id,
        type: job.type,
        status: job.status,
        resultUrl: job.resultUrl,
        error: job.error,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
