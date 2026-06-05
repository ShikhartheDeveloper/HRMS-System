import express from 'express';
import * as attendanceController from './attendance.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { tenantScope } from '../../middleware/tenantScope.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantScope);

// Punch routes
router.post('/punch-in', attendanceController.punchIn);
router.post('/punch-out', attendanceController.punchOut);

// Records view
router.get('/my-records', attendanceController.getMyRecords);
router.get('/team-records', attendanceController.getTeamRecords);

// Regularization routes
router.post('/regularization', attendanceController.requestRegularization);
router.put('/regularization/:id/approve', authorize('MANAGER', 'HR_ADMIN', 'LEADERSHIP'), attendanceController.reviewRegularization);

export default router;
