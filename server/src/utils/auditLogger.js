import AuditLog from '../models/AuditLog.model.js';

/**
 * Creates an immutable audit log entry.
 * @param {Object} params
 * @param {string} params.action - Action description (e.g. LOGIN_SUCCESS, LEAVE_APPROVED)
 * @param {string} params.userId - User ID who triggered the action
 * @param {string} params.tenantId - Tenant ID context
 * @param {string} [params.targetId] - Target ID of entity being altered
 * @param {Object} [params.meta] - Metadata regarding the audit log
 */
export const writeAuditLog = async ({ action, userId, tenantId, targetId, meta = {} }) => {
  try {
    if (!action || !tenantId) {
      console.warn('Audit logger warning: action and tenantId are required');
      return;
    }

    // Scrub potential sensitive keys from metadata
    const scrubbedMeta = JSON.parse(JSON.stringify(meta));
    const sensitiveKeys = ['password', 'token', 'secret', 'accessToken', 'refreshToken'];
    for (const key of Object.keys(scrubbedMeta)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        scrubbedMeta[key] = '[REDACTED]';
      }
    }

    await AuditLog.create({
      tenantId,
      userId,
      action,
      targetId,
      meta: scrubbedMeta
    });
  } catch (error) {
    console.error('Audit logger failed to write log:', error.message);
  }
};
