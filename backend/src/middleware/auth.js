const { verifyAccess } = require('../config/jwt');
const db = require('../config/database');

async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccess(token);
    // Reload user from DB to ensure they are still active
    const [rows] = await db.query(
      'SELECT id, institute_id, email, role, full_name, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

async function requireStaffPermission(permission) {
  return async (req, res, next) => {
    if (req.user.role === 'admin') return next();
    const [rows] = await db.query(
      'SELECT * FROM staff_profiles WHERE user_id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(403).json({ success: false, message: 'Staff profile not found' });
    if (!rows[0][permission]) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }
    req.staffProfile = rows[0];
    next();
  };
}

module.exports = { authenticate, requireRole, requireStaffPermission };
