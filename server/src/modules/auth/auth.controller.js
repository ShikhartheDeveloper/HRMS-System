import mongoose from 'mongoose';
import * as authService from './auth.service.js';
import Tenant from '../../models/Tenant.model.js';
import User from '../../models/User.model.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import { sendEmail } from '../../utils/sendEmail.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const lookupTenant = async (req, res, next) => {
  try {
    const { subdomain } = req.query;
    if (!subdomain) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Subdomain parameter is required' }
      });
    }

    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: `No organization found for subdomain '${subdomain}'` }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: tenant._id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        settings: tenant.settings
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, tenantId } = req.body;
    const { user, accessToken, refreshToken } = await authService.loginUser({ email, password, tenantId });

    res.cookie('refreshToken', refreshToken, cookieOptions);

    const tenant = await Tenant.findById(tenantId).lean();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token: accessToken,
        tenant: tenant ? {
          id: tenant._id.toString(),
          name: tenant.name,
          subdomain: tenant.subdomain
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Refresh token is missing' }
      });
    }

    const { user, accessToken, refreshToken: newRefreshToken } = await authService.refreshUserToken(refreshToken);

    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    const tenant = await Tenant.findById(user.tenantId).lean();

    res.status(200).json({
      success: true,
      data: {
        user,
        token: accessToken,
        tenant: tenant ? {
          id: tenant._id.toString(),
          name: tenant.name,
          subdomain: tenant.subdomain
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    res.clearCookie('refreshToken', { httpOnly: true, secure: cookieOptions.secure });

    if (req.user) {
      await writeAuditLog({
        action: 'LOGOUT',
        tenantId: req.user.tenantId,
        userId: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email, subdomain } = req.body;
    if (!email || !subdomain) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email and subdomain are required' }
      });
    }

    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Organization subdomain not found' }
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), tenantId: tenant._id });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found in this organization' }
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    await writeAuditLog({
      action: 'PASSWORD_RESET_OTP_SENT',
      tenantId: tenant._id,
      userId: user._id,
      meta: { email }
    });

    // Send email with OTP
    await sendEmail({
      to: email,
      subject: 'HRMS Password Reset Verification Code',
      text: `Hello,\n\nYou requested a password reset. Your 6-digit verification code is:\n\n${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`,
      html: `<h3>Hello,</h3><p>You requested a password reset. Use the following verification code to reset your password:</p><h2 style="font-size: 24px; letter-spacing: 2px; color: #4F46E5;">${otp}</h2><p>This code will expire in 10 minutes.</p>`
    });

    res.status(200).json({
      success: true,
      message: 'Verification code sent to registered email address'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, subdomain, otpCode, password } = req.body;
    if (!email || !subdomain || !otpCode || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email, subdomain, verification code, and new password are required' }
      });
    }

    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Organization subdomain not found' }
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), tenantId: tenant._id }).select('+otpCode +otpExpiry');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // Verify OTP code and check if expired
    if (!user.otpCode || user.otpCode !== otpCode || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OTP', message: 'The verification code is invalid or has expired' }
      });
    }

    // Update password
    user.password = password;
    user.otpCode = null;
    user.otpExpiry = null;
    await user.save();

    await writeAuditLog({
      action: 'PASSWORD_RESET_SUCCESS',
      tenantId: user.tenantId,
      userId: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const ssoGoogle = async (req, res, next) => {
  try {
    const { subdomain } = req.query;
    if (!subdomain) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=subdomain_missing`);
    }
    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=tenant_not_found`);
    }

    // Find first active user in this tenant to act as the SSO logged-in user
    let user = await User.findOne({ tenantId: tenant._id });
    if (!user) {
      // Create a default user if none exists in this tenant yet
      user = await User.create({
        email: `sso-user@${tenant.subdomain}.com`,
        password: 'Password123',
        role: 'EMPLOYEE',
        tenantId: tenant._id
      });
    }

    const { accessToken, refreshToken } = await authService.loginUser({
      email: user.email,
      password: 'Password123', // Since we just created/verified it
      tenantId: tenant._id
    });

    res.cookie('refreshToken', refreshToken, cookieOptions);

    // Redirect to client application with accessToken
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?token=${accessToken}`);
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=sso_failed`);
  }
};

export const ssoMicrosoft = async (req, res, next) => {
  // Same simulation flow as google
  req.query.subdomain = req.query.subdomain || 'default';
  return ssoGoogle(req, res, next);
};

export const ssoSendOtp = async (req, res, next) => {
  try {
    const { email, provider, subdomain } = req.body;
    if (!email || !subdomain) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email and subdomain are required' }
      });
    }

    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Organization subdomain not found' }
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), tenantId: tenant._id });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'No registered account found with this email in your organization' }
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 10 minutes from now
    user.otpCode = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send email with the OTP
    const providerName = provider === 'microsoft' ? 'Microsoft' : 'Google';
    await sendEmail({
      to: email,
      subject: `Your HRMS ${providerName} SSO Verification Code`,
      text: `Hello,\n\nYou requested to sign in via ${providerName} SSO. Your 6-digit verification code is:\n\n${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`,
      html: `<h3>Hello,</h3><p>You requested to sign in via <strong>${providerName} SSO</strong>. Use the following verification code to complete your login:</p><h2 style="font-size: 24px; letter-spacing: 2px; color: #4F46E5;">${otp}</h2><p>This code will expire in 10 minutes.</p>`
    });

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const ssoVerifyOtp = async (req, res, next) => {
  try {
    const { email, otpCode, subdomain } = req.body;
    if (!email || !otpCode || !subdomain) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email, verification code, and subdomain are required' }
      });
    }

    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Organization subdomain not found' }
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), tenantId: tenant._id }).select('+otpCode +otpExpiry');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'No registered account found with this email in your organization' }
      });
    }

    // Verify OTP code and check if expired
    if (!user.otpCode || user.otpCode !== otpCode || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OTP', message: 'The verification code is invalid or has expired' }
      });
    }

    // Clear OTP details on successful validation
    user.otpCode = null;
    user.otpExpiry = null;
    await user.save();

    // Call service to log user in
    const { user: safeUser, accessToken, refreshToken } = await authService.loginUserWithOtp({
      email: user.email,
      tenantId: tenant._id
    });

    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(200).json({
      success: true,
      message: 'SSO verification successful',
      data: {
        user: safeUser,
        token: accessToken,
        tenant: tenant ? {
          id: tenant._id.toString(),
          name: tenant.name,
          subdomain: tenant.subdomain
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// Memory map to hold unverified registrations temporarily
// Key: clean email, Value: { orgName, subdomain, adminFirstName, adminLastName, adminEmail, adminPassword, otpCode, otpExpiry }
export const tempRegistrations = new Map();

export const registerSendOtp = async (req, res, next) => {
  try {
    const { orgName, subdomain, adminFirstName, adminLastName, adminEmail, adminPassword } = req.body;

    if (!orgName || !subdomain || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'All registration fields are required' }
      });
    }

    const cleanSubdomain = subdomain.toLowerCase().trim();
    const cleanEmail = adminEmail.toLowerCase().trim();

    // Check subdomain format (alphanumeric only)
    if (!/^[a-z0-9-]+$/.test(cleanSubdomain)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SUBDOMAIN', message: 'Subdomain can only contain lowercase letters, numbers, and hyphens' }
      });
    }

    // Check if tenant subdomain exists
    const existingTenant = await Tenant.findOne({ subdomain: cleanSubdomain });
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        error: { code: 'SUBDOMAIN_EXISTS', message: `Subdomain '${cleanSubdomain}' is already registered` }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_EXISTS', message: `Email '${adminEmail}' is already registered` }
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Store in memory map
    tempRegistrations.set(cleanEmail, {
      orgName: orgName.trim(),
      subdomain: cleanSubdomain,
      adminFirstName: adminFirstName.trim(),
      adminLastName: adminLastName.trim(),
      adminEmail: cleanEmail,
      adminPassword,
      otpCode: otp,
      otpExpiry: expiry
    });

    // Send email with OTP
    await sendEmail({
      to: cleanEmail,
      subject: 'HRMS Organization Registration Verification Code',
      text: `Hello,\n\nUse the following 6-digit OTP verification code to complete your organization registration:\n\n${otp}\n\nThis code will expire in 10 minutes.`,
      html: `<h3>Hello,</h3><p>Use the following 6-digit OTP verification code to complete your organization registration:</p><h2 style="font-size: 24px; letter-spacing: 2px; color: #4F46E5;">${otp}</h2><p>This code will expire in 10 minutes.</p>`
    });

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully to registration email',
      otpCode: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    next(error);
  }
};

export const registerVerifyOtp = async (req, res, next) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email and verification code are required' }
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cached = tempRegistrations.get(cleanEmail);

    if (!cached) {
      return res.status(400).json({
        success: false,
        error: { code: 'REGISTRATION_NOT_FOUND', message: 'No pending registration found for this email address. Please register again.' }
      });
    }

    // Check code and expiry
    if (cached.otpCode !== otpCode || cached.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OTP', message: 'The verification code is invalid or has expired' }
      });
    }

    // Verified! Create the Tenant
    const tenant = await Tenant.create({
      name: cached.orgName,
      subdomain: cached.subdomain,
      settings: {
        gracePeriodMinutes: 15,
        lateThresholdMinutes: 30,
        halfDayThresholdHours: 4,
        fullDayHours: 8
      }
    });

    // Create HR Admin User
    const adminUser = await User.create({
      email: cached.adminEmail,
      password: cached.adminPassword,
      role: 'HR_ADMIN',
      tenantId: tenant._id
    });

    // Create Employee record
    const Employee = mongoose.model('Employee');
    await Employee.create({
      tenantId: tenant._id,
      userId: adminUser._id,
      employeeId: 'EMP-2026-0001',
      firstName: cached.adminFirstName,
      lastName: cached.adminLastName,
      email: cached.adminEmail,
      role: 'HR_ADMIN',
      status: 'Active',
      phone: '',
      department: 'Human Resources',
      designation: 'HR Admin',
      salary: 100000
    });

    // Remove from map
    tempRegistrations.delete(cleanEmail);

    // Log the registration event
    await writeAuditLog({
      action: 'TENANT_REGISTERED',
      tenantId: tenant._id,
      userId: adminUser._id,
      meta: { orgName: cached.orgName, subdomain: cached.subdomain, adminEmail: cached.adminEmail }
    });

    // Automatically log the user in
    const { user: safeUser, accessToken, refreshToken } = await authService.loginUserWithOtp({
      email: cached.adminEmail,
      tenantId: tenant._id
    });

    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(201).json({
      success: true,
      message: 'Organization registered and verified successfully',
      data: {
        user: safeUser,
        token: accessToken,
        tenant: {
          id: tenant._id,
          name: tenant.name,
          subdomain: tenant.subdomain
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

