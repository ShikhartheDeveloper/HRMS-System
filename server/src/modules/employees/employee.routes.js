import express from 'express';
import * as employeeController from './employee.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { tenantScope } from '../../middleware/tenantScope.js';

const router = express.Router();

// Apply auth and tenant scoping globally to employee routes
router.use(authenticate);
router.use(tenantScope);

// Org Chart & CSV Import
router.get('/org-chart', employeeController.getOrgChart);
router.post('/bulk-import', authorize('HR_ADMIN'), employeeController.bulkImport);

// CRUD operations
router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployee);
router.post('/', authorize('HR_ADMIN'), employeeController.createEmployee);
router.put('/:id', authorize('HR_ADMIN'), employeeController.updateEmployee);
router.delete('/:id', authorize('HR_ADMIN'), employeeController.deleteEmployee);
router.post('/:id/send-email', authorize('HR_ADMIN', 'MANAGER', 'LEADERSHIP'), employeeController.sendEmployeeEmail);

export default router;
