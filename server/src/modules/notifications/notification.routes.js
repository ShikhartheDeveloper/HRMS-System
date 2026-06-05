import express from 'express';
import * as notificationController from './notification.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { tenantScope } from '../../middleware/tenantScope.js';

const router = express.Router();

// Apply auth and tenant scoping globally
router.use(authenticate);
router.use(tenantScope);

// List notifications
router.get('/', notificationController.getNotifications);

// Mark all as read (Place before /:id to prevent routing conflict)
router.put('/read-all', notificationController.markAllAsRead);

// Mark single as read
router.put('/:id/read', notificationController.markAsRead);

// Soft-delete
router.delete('/:id', notificationController.deleteNotification);

export default router;
