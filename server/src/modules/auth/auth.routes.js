import express from 'express';
import * as authController from './auth.controller.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = express.Router();

// Public Subdomain Discovery
router.get('/tenant-lookup', authController.lookupTenant);
router.post('/register-send-otp', authController.registerSendOtp);
router.post('/register-verify-otp', authController.registerVerifyOtp);

// Authentication Endpoints
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Password Management
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// SSO Simulation Routes
router.get('/sso/google', authController.ssoGoogle);
router.get('/sso/microsoft', authController.ssoMicrosoft);
router.post('/sso/send-otp', authController.ssoSendOtp);
router.post('/sso/verify-otp', authController.ssoVerifyOtp);

export default router;
