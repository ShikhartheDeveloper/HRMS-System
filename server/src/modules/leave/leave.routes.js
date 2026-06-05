import express from 'express';
import * as leaveController from './leave.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { tenantScope } from '../../middleware/tenantScope.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantScope);

// Apply & Balance
router.post('/apply', leaveController.applyLeave);
router.get('/balance', leaveController.getBalances);
router.get('/history', leaveController.getHistory);

// Dashboards and calendar logs
router.get('/team-calendar', leaveController.getTeamCalendar);
router.get('/pending-approvals', leaveController.getPendingApprovals);

// Approval actions
router.put('/:id/approve', authorize('MANAGER', 'HR_ADMIN', 'LEADERSHIP'), leaveController.approveLeave);
router.put('/:id/cancel', leaveController.cancelLeave);

export default router;
