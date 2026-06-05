import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import User from '../../models/User.model.js';
import Tenant from '../../models/Tenant.model.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import Employee from '../employees/employee.model.js';

// Helper to generate access and refresh tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, tenantId: user.tenantId },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiration }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiration }
  );

  return { accessToken, refreshToken };
};

export const loginUser = async ({ email, password, tenantId }) => {
  const user = await User.findOne({ email, tenantId }).select('+password +failedLoginAttempts +lockoutUntil');
  
  if (!user) {
    // Audit failed attempt (tenant exists, but email doesn't)
    await writeAuditLog({
      action: 'LOGIN_FAILURE_EMAIL_NOT_FOUND',
      tenantId,
      meta: { email }
    });
    throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  // Check Lockout
  if (user.isLockedOut()) {
    const remainingMs = user.lockoutUntil - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    
    await writeAuditLog({
      action: 'LOGIN_ATTEMPT_LOCKED_OUT',
      tenantId,
      userId: user._id,
      meta: { email }
    });

    throw {
      statusCode: 423,
      code: 'ACCOUNT_LOCKED',
      message: `Account is temporarily locked due to multiple failed attempts. Try again in ${remainingMinutes} minute(s).`,
      lockoutUntil: user.lockoutUntil
    };
  }

  // Verify Password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await user.save();
      
      await writeAuditLog({
        action: 'ACCOUNT_LOCKOUT_TRIGGERED',
        tenantId,
        userId: user._id,
        meta: { email }
      });

      throw {
        statusCode: 423,
        code: 'ACCOUNT_LOCKED',
        message: 'Too many failed attempts. Your account has been locked for 15 minutes.',
        lockoutUntil: user.lockoutUntil
      };
    }

    await user.save();

    await writeAuditLog({
      action: 'LOGIN_FAILURE_WRONG_PASSWORD',
      tenantId,
      userId: user._id,
      meta: { email, attemptCount: user.failedLoginAttempts }
    });

    throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  // Successful Login: reset attempts
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  await user.save();

  const { accessToken, refreshToken } = generateTokens(user);

  // Fetch full details without password and attach employee profile
  const safeUser = await User.findById(user._id).select('-password').lean();
  const employee = await Employee.findOne({ userId: user._id }).lean();
  safeUser.id = safeUser._id.toString();
  safeUser.employee = employee || null;

  await writeAuditLog({
    action: 'LOGIN_SUCCESS',
    tenantId,
    userId: user._id,
    meta: { email }
  });

  return { user: safeUser, accessToken, refreshToken };
};

export const refreshUserToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
    const user = await User.findById(decoded.id).lean();

    if (!user || user.isDeleted) {
      throw { statusCode: 401, code: 'UNAUTHORIZED', message: 'User not found or deactivated' };
    }

    const tokens = generateTokens(user);

    const employee = await Employee.findOne({ userId: user._id }).lean();
    user.id = user._id.toString();
    user.employee = employee || null;

    await writeAuditLog({
      action: 'TOKEN_REFRESHED',
      tenantId: user.tenantId,
      userId: user._id
    });

    return { user, ...tokens };
  } catch (error) {
    if (error.statusCode) throw error;
    throw { statusCode: 401, code: 'UNAUTHORIZED', message: 'Invalid refresh token' };
  }
};

export const loginUserWithOtp = async ({ email, tenantId }) => {
  const user = await User.findOne({ email, tenantId }).select('+failedLoginAttempts +lockoutUntil');
  if (!user) {
    throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
  }

  // Reset lockout
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  await user.save();

  const { accessToken, refreshToken } = generateTokens(user);
  
  // Fetch full details without password and attach employee profile
  const safeUser = await User.findById(user._id).select('-password').lean();
  const employee = await Employee.findOne({ userId: user._id }).lean();
  safeUser.id = safeUser._id.toString();
  safeUser.employee = employee || null;

  await writeAuditLog({
    action: 'LOGIN_SUCCESS_SSO',
    tenantId,
    userId: user._id,
    meta: { email }
  });

  return { user: safeUser, accessToken, refreshToken };
};
