
function requireAdminAuth(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const expectedKey = process.env.ADMIN_API_KEY || 'raahi_ctu_admin_secret_key_2026';

  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Admin authentication required. Invalid or missing API key.'
      }
    });
  }

  next();
}

module.exports = {
  requireAdminAuth
};

