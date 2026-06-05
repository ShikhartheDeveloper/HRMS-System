import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route Imports
import authRoutes from './modules/auth/auth.routes.js';
import employeeRoutes from './modules/employees/employee.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import leaveRoutes from './modules/leave/leave.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import uploadRoutes from './modules/uploads/upload.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

import path from 'path';

const app = express();

// Serve static export files
app.use('/exports', express.static(path.join(process.cwd(), 'public', 'exports')));

// Security Middlewares
app.use(helmet());

// CORS config - whitelist credentials
app.use(cors({
  origin: true, // In development, allow the caller origin dynamically
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all requests
app.use('/api/', apiRateLimiter);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
