# HRMS Portal — Comprehensive Multi-Tenant SaaS Platform

Welcome to the **Human Resource Management System (HRMS)**. This is a production-ready, fully-featured, and secure multi-tenant SaaS application designed to manage organizational workforces, attendance tracking, leave requests, document storage, direct communications, and financial/payroll analytics.

The application features a modern, obsidian-dark user interface with glassmorphism effects, neon borders, smooth interactive transitions, and responsive charts.

---

## Table of Contents
1. [Core Features & Capabilities](#core-features--capabilities)
2. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
3. [Architecture & Directory Structure](#architecture--directory-structure)
4. [Environment Configurations (.env)](#environment-configurations-env)
5. [Getting Started (Local Setup)](#getting-started-local-setup)
6. [Render Deployment Guide](#render-deployment-guide)
7. [API Routing Overview](#api-routing-overview)
8. [Database Schema Models](#database-schema-models)

---

## Core Features & Capabilities

* **Multi-Tenant Architecture**: Supports workspace creation and lookup via unique tenant subdomains (e.g. `redvision.hrms.local`).
* **Self-Serve Organization Registration**: OTP-verified company registration flow. Automatically registers a new tenant workspace, creates settings (grace periods, shifts, etc.), and provisions the admin user profile.
* **OTP-Based Authentication & Password Reset**: Safe, password-free SSO OTP flows and a comprehensive self-serve **Forgot Password** process that sends a 6-digit OTP code to the registered email address.
* **Attendance Engine**: Interactive Clock-In/Clock-Out widget with calculation of shift durations, late indicators, half-day/full-day thresholds, and manager adjustment approval requests.
* **Leave Management System**: Interactive leave submission calendar. Includes full workflow transitions (Pending -> Approved / Rejected) with manager dashboard controls.
* **Document Vault (AWS S3)**: Integrated AWS S3 object storage for uploading and viewing sensitive documents (identification, contracts, tax files). Implements secure AWS Presigned URLs to restrict asset access.
* **HR Broadcast Communications**: Rich message compose widget inside the Employee Directory. Allows HR Admins and Managers to dispatch formatted emails directly to employees.
* **Payroll & Workforce Insights**: Advanced reports dashboard with headcounts, department distribution pie charts, salary flow summaries, and total cost flow analytics.

---

## Role-Based Access Control (RBAC)

The application implements four distinct user authorization levels:

| Role | Access Level & Key Actions |
|---|---|
| **`HR_ADMIN`** | Complete dashboard control. Access to the entire employee directory, bulk employee imports (CSV), direct email dispatching, document directories, settings configuration, attendance logs, and leave approval tools. |
| **`MANAGER`** | Can manage employees assigned under their direct reports. Includes leave request approvals, attendance correction verification, and basic communication options. |
| **`EMPLOYEE`** | Access to personal dashboard, personal profile view, document storage directory, personal attendance clocking widgets, and leave requests. |
| **`LEADERSHIP`** | Restricted **Read-Only** access. Can see organization dashboard stats, employee lists, and payroll costs/salary flow charts, but cannot add employees, upload documents, or modify records. |

---

## Architecture & Directory Structure

The project is structured as a monorepo consisting of a React frontend and a Node.js/Express backend:

```
HRMS/
├── client/                 # Frontend React SPA
│   ├── dist/               # Built static production client files
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── components/     # Reusable layout and custom UI components
│   │   ├── pages/          # Page views (Auth, Dashboard, Employees, Reports, etc.)
│   │   ├── services/       # Axios API client wrapper
│   │   ├── store/          # Zustand global state store (Auth state)
│   │   └── index.css       # Core styling, animations, and Tailwind imports
│   ├── tailwind.config.js  # Styling variables (colors, fonts, keyframes)
│   └── vite.config.js      # Vite project bundler settings
│
├── server/                 # Backend RESTful Express Server
│   ├── src/
│   │   ├── config/         # MongoDB, S3 Client, SMTP, and Env Schemas
│   │   ├── middleware/     # Rate limiter, authenticate, and error handlers
│   │   ├── models/         # Core shared Mongoose schemas (User, Tenant, Logs)
│   │   ├── modules/        # Domain-driven backend business modules:
│   │   │   ├── attendance/ # Clock records and shift validations
│   │   │   ├── auth/       # Password verification, SSO, OTP, and resets
│   │   │   ├── employees/  # CRUD profiles and CSV import
│   │   │   ├── leave/      # Leave requests and calendar hooks
│   │   │   ├── notifications/ # Real-time system messages
│   │   │   └── reports/    # Department metrics and salary analytics
│   │   └── utils/          # Nodemailer SMTP wrappers, audit log helpers
│   ├── server.js           # Server entry point
│   └── package.json        # Backend configurations & scripts
│
├── package.json            # Monorepo root scripts
└── render.yaml             # Render infrastructure blueprint file
```

---

## Environment Configurations (.env)

Create a `.env` file in the `server/` directory. The configuration variables are validated on server startup:

```env
# Application Settings
NODE_ENV=development
PORT=5000

# Authentication Secrets (Generate secure random strings)
JWT_SECRET=your_jwt_access_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Database Settings
# Set to 'memory' to run an in-memory Mongo server, or provide a real MongoDB connection string:
MONGODB_URI=mongodb://127.0.0.1:27017/hrms

# SMTP Mailer Settings (e.g. Gmail App Password, Mailtrap, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_EMAIL=no-reply@hrms.local

# AWS S3 Document Storage Settings
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-s3-bucket-name
```

---

## Getting Started (Local Setup)

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **MongoDB** (If not using the built-in `memory` Mongo server)

### Installation Steps

1. **Clone and Install Dependencies**:
   Open a terminal in the root directory (`HRMS`) and run the setup script:
   ```bash
   npm run install-all
   ```
   This will install all dependencies for both the backend server and frontend client concurrently.

2. **Configure Environment Variables**:
   Create and populate the `server/.env` file with your settings using the template in the [Environment Configurations](#environment-configurations-env) section.

3. **Build the Client Assets**:
   Compile the React production bundle:
   ```bash
   npm run build
   ```
   This builds the frontend client files into `client/dist`. The Express server is preconfigured to serve these static assets automatically.

4. **Launch the Application**:
   Start the Express server:
   ```bash
   npm start
   ```
   The application will be accessible at: `http://localhost:5000`.

5. **Standalone Client Development (Optional)**:
   If you want to run a standalone Vite frontend server with hot module replacement (HMR), run:
   ```bash
   npm run dev --prefix client
   ```
   This standalone server starts at `http://localhost:5173`. Make sure the Express server is also running on port `5000` to serve the API endpoints.

---

## Render Deployment Guide

This project includes a `render.yaml` blueprint for zero-config deployments on **Render**:

1. Log in to your Render Dashboard.
2. Click **New** -> **Blueprint**.
3. Select your repository containing the HRMS project.
4. Render will automatically read the `render.yaml` configurations:
   * **Build Command**: `npm run build`
   * **Start Command**: `npm start`
5. Provide the required environment variables in the Render console:
   * `MONGO_URI` (Your MongoDB Atlas connection URI)
   * `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` (S3 permissions)
   * `AWS_REGION` & `AWS_S3_BUCKET_NAME` (S3 bucket details)
   * `EMAIL_USER` & `EMAIL_PASS` (SMTP credentials)
   * The `JWT_SECRET` will be automatically generated by Render.

---

## API Routing Overview

All API requests are prefixed with `/api` and are dynamically verified against the tenant subdomain:

### Authentication (`/api/auth`)
* `GET /tenant-lookup?subdomain=XYZ`: Resolves tenant settings and name.
* `POST /register-send-otp`: Sends a 6-digit registration OTP verification email.
* `POST /register-verify-otp`: Validates the registration OTP and creates the workspace/admin.
* `POST /login`: Standard email/password credential validation.
* `POST /refresh`: Standard JWT token rotation.
* `POST /logout`: Clears session tokens.
* `POST /forgot-password`: Submits email to send password recovery OTP.
* `POST /reset-password`: Validates OTP and updates to a new password.

### Employees (`/api/employees`)
* `GET /`: Lists all employees inside the tenant domain.
* `POST /`: Creates a new employee profile (`HR_ADMIN` only).
* `POST /bulk-import`: Imports employees via CSV (`HR_ADMIN` only).
* `POST /:id/send-email`: Sends a formatted email directly to the employee.

### Leave requests (`/api/leave`)
* `POST /`: Submits a leave request.
* `GET /my-leaves`: Retrieves leaves for the logged-in user.
* `GET /approvals`: Lists all pending leave approvals (`HR_ADMIN` / `MANAGER` only).
* `PATCH /:id`: Action approvals or rejections.

---

## Database Schema Models

The system architecture utilizes 7 Mongoose schemas to represent data fields:
1. **Tenant**: Stores company settings, thresholds, and subdomains.
2. **User**: Credentials, failed login tracking, and OTP verification parameters.
3. **Employee**: Complete profile data (phone, salary, role, managerId, and job title).
4. **Attendance**: Clock records (in, out, status, shift hours, and locations).
5. **Leave**: Application details (dates, leave types, reasons, and status).
6. **Document**: S3 object keys, mime-types, and ownership maps.
7. **AuditLog**: Cryptographic-like history trail logging all system updates.
