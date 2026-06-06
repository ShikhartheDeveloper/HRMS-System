import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantScope } from '../../middleware/tenantScope.js';
import { authorize } from '../../middleware/authorize.js';
import * as aiController from './ai.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantScope);
// Restrict all AI Advisory features to HR_ADMIN and LEADERSHIP roles
router.use(authorize('HR_ADMIN', 'LEADERSHIP'));

router.get('/history', aiController.getAIHistory);
router.get('/search', aiController.handleSmartSearch);
router.get('/summary/:employeeId', aiController.handleEmployeeSummary);
router.get('/workforce', aiController.handleWorkforcePlanning);
router.get('/attrition', aiController.handleAttritionPrediction);
router.get('/attendance-anomalies', aiController.handleAttendanceAnomalies);
router.post('/screen-resume', aiController.handleScreenResume);
router.post('/:id/action', aiController.handleActionApproval);

export default router;
