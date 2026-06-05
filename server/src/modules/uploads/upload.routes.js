import express from 'express';
import * as uploadController from './upload.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantScope } from '../../middleware/tenantScope.js';
import { uploadImage, uploadDocument } from '../../middleware/uploadMiddleware.js';

const router = express.Router();

// Apply auth and tenant scoping globally
router.use(authenticate);
router.use(tenantScope);

// Profile Image
router.post('/profile-image/:employeeId', uploadImage, uploadController.uploadProfileImage);
router.get('/profile-image/:employeeId', uploadController.getProfileImage);

// Documents
router.post('/documents/:employeeId', uploadDocument, uploadController.uploadDocumentFile);
router.get('/documents/:employeeId', uploadController.getDocuments);
router.get('/documents/url/:documentId', uploadController.getDocumentUrl);
router.delete('/documents/:documentId', uploadController.deleteDocument);

export default router;
