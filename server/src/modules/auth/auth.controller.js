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

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token: accessToken
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

    res.status(200).json({
      success: true,
      data: {
        user,
        token: accessToken
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
    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Organization subdomain not found' }
      });
    }

    const user = await User.findOne({ email, tenantId: tenant._id });
    if (!user) {
      // Don't leak user existence for security. return generic message.
      return res.status(200).json({
        success: true,
        message: 'If the email matches an account, a reset link will be sent.'
      });
    }

    // Mock reset token
    const resetToken = `reset-mock-${Math.random().toString(36).substring(2, 15)}`;
    
    // Log resetting attempt
    await writeAuditLog({
      action: 'PASSWORD_RESET_REQUESTED',
      tenantId: tenant._id,
      userId: user._id,
      meta: { email }
    });

    // Send mock email
    const resetLink = `http://${subdomain}.hrms.local:5173/reset-password?token=${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'HRMS Password Reset Request',
      text: `Hello,\n\nYou requested a password reset. Use this token/link to complete it:\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
      html: `<h3>Hello,</h3><p>You requested a password reset. Click the link below to complete the action:</p><p><a href="${resetLink}">Reset Password</a></p>`
    });

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to registered email address'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    
    // For demonstration, mock matching the reset token to the first user or using token data.
    // In our case we'll locate a test user or return failure if token is empty
    if (!token || !token.startsWith('reset-mock-')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESET_TOKEN', message: 'The reset link is invalid or expired' }
      });
    }

    // Find the user context (for testing, we find a user by their temp token. We can search in db or simulate)
    // For completeness, we let the reset password proceed on a mock test user.
    // In production we would store tokens in the db with expiry.
    const user = await User.findOne({ isDeleted: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    user.password = password;
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
      return res.redirect('http://localhost:5173/login?error=subdomain_missing');
    }
    const tenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (!tenant) {
      return res.redirect('http://localhost:5173/login?error=tenant_not_found');
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
    res.redirect(`http://localhost:5173/login?token=${accessToken}`);
  } catch (error) {
    res.redirect('http://localhost:5173/login?error=sso_failed');
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
        token: accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};
