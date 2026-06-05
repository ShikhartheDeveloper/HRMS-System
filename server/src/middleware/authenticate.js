import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.model.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is missing'
        }
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, env.jwt.secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is invalid or expired'
        }
      });
    }

    // Find user and check status
    const user = await User.findById(decoded.id).select('+role +tenantId');
    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User no longer exists or is deactivated'
        }
      });
    }

    // Attach to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };

    next();
  } catch (error) {
    next(error);
  }
};
