export const tenantScope = (req, res, next) => {
  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_MISSING',
        message: 'Access denied: Active tenant context is required'
      }
    });
  }

  req.tenantId = req.user.tenantId;

  // Utility to append tenantId to filter queries
  req.scopeQuery = (filter = {}) => {
    return { ...filter, tenantId: req.user.tenantId };
  };

  // Utility to append tenantId to insert/update payloads
  req.scopeBody = (payload = {}) => {
    return { ...payload, tenantId: req.user.tenantId };
  };

  next();
};
