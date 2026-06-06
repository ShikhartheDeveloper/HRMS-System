import express from 'express';
import * as reportController from './report.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { tenantScope } from '../../middleware/tenantScope.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantScope);

// Analytical metrics
router.get('/headcount', authorize('HR_ADMIN', 'LEADERSHIP'), reportController.getHeadcount);
router.get('/attendance-summary', authorize('HR_ADMIN', 'LEADERSHIP'), reportController.getAttendance);
router.get('/leave-usage', authorize('HR_ADMIN', 'LEADERSHIP'), reportController.getLeaves);
router.get('/attrition', authorize('HR_ADMIN', 'LEADERSHIP'), reportController.getAttrition);
router.get('/salary-flow', authorize('HR_ADMIN', 'LEADERSHIP'), reportController.getSalaryFlows);

// Async CSV Exports
router.post('/export', authorize('HR_ADMIN', 'LEADERSHIP'), reportController.exportReport);
router.get('/export-status/:jobId', reportController.getExportStatus);

export default router;
