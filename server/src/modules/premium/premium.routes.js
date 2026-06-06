import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantScope } from '../../middleware/tenantScope.js';
import { authorize } from '../../middleware/authorize.js';
import { uploadImage, uploadDocument } from '../../middleware/uploadMiddleware.js';
import * as premiumController from './premium.controller.js';

import Tenant from '../../models/Tenant.model.js';

const router = express.Router();

// Public recruitment routes (No Auth required)
const publicTenantScope = async (req, res, next) => {
  try {
    const subdomain = req.query.subdomain || req.headers['x-tenant-subdomain'];
    if (!subdomain) {
      return res.status(400).json({
        success: false,
        error: { code: 'SUBDOMAIN_REQUIRED', message: 'Subdomain parameter is required' }
      });
    }
    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: `No organization found for subdomain '${subdomain}'` }
      });
    }
    req.tenantId = tenant._id;
    next();
  } catch (error) {
    next(error);
  }
};

router.get('/public/recruitment/jobs', publicTenantScope, premiumController.getPublicJobs);
router.post('/public/recruitment/candidates', publicTenantScope, premiumController.createCandidate);

router.use(authenticate);
router.use(tenantScope);

// 1. Payroll routes
router.get('/payroll', premiumController.getPayroll);
router.post('/payroll/run', authorize('HR_ADMIN', 'LEADERSHIP'), premiumController.runPayroll);
router.put('/payroll/:id/pay', authorize('HR_ADMIN'), premiumController.payPayroll);

// 2. Performance routes
router.get('/performance', premiumController.getPerformance);
router.post('/performance/goal', authorize('HR_ADMIN', 'MANAGER', 'LEADERSHIP'), premiumController.addGoal);
router.post('/performance/review', premiumController.submitReview);

// 3. Recruitment routes
router.get('/recruitment/jobs', premiumController.getJobs);
router.post('/recruitment/jobs', authorize('HR_ADMIN'), uploadImage, premiumController.createJob);
router.get('/recruitment/candidates', authorize('HR_ADMIN', 'LEADERSHIP'), premiumController.getCandidates);
router.post('/recruitment/candidates', premiumController.createCandidate);
router.put('/recruitment/candidates/:id/stage', authorize('HR_ADMIN'), premiumController.updateCandidateStage);

// 4. Onboarding routes
router.get('/onboarding', premiumController.getOnboarding);
router.post('/onboarding/documents', authorize('HR_ADMIN', 'LEADERSHIP'), uploadDocument, premiumController.uploadOnboardingDocument);
router.put('/onboarding/:id/task', premiumController.updateOnboardingTask);

// 5. Expense routes
router.get('/expenses', premiumController.getExpenses);
router.post('/expenses', premiumController.createExpense);
router.put('/expenses/:id/approve', authorize('HR_ADMIN', 'MANAGER'), premiumController.approveExpense);

// 6. Training / L&D routes
router.get('/training/courses', premiumController.getCourses);
router.post('/training/courses', authorize('HR_ADMIN'), premiumController.createCourse);
router.get('/training/progress', premiumController.getTrainingProgress);
router.post('/training/enroll', premiumController.enrollCourse);

// 7. Asset routes
router.get('/assets', authorize('HR_ADMIN', 'LEADERSHIP'), premiumController.getAssets);
router.post('/assets', authorize('HR_ADMIN'), premiumController.createAsset);
router.put('/assets/:id/allocate', authorize('HR_ADMIN'), premiumController.allocateAsset);

// 8. Helpdesk routes
router.get('/tickets', premiumController.getTickets);
router.post('/tickets', premiumController.createTicket);
router.put('/tickets/:id/resolve', authorize('HR_ADMIN', 'MANAGER'), premiumController.resolveTicket);

export default router;
