const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { signAccess, signRefresh, verifyRefresh, hashToken, refreshExpiresAt } = require('../config/jwt');
const activityLogger = require('../utils/activityLogger');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query(
      'SELECT u.*, sp.id as staff_profile_id, sp.can_collect_fees, sp.can_edit_attendance FROM users u LEFT JOIN staff_profiles sp ON sp.user_id = u.id WHERE u.email = ?',
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const user = rows[0];
    if (!user.is_active) return res.status(401).json({ success: false, message: 'Account is deactivated' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const payload = { userId: user.id, instituteId: user.institute_id, role: user.role };
    const accessToken  = signAccess(payload);
    const refreshToken = signRefresh(payload);

    // Store refresh token hash
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, hashToken(refreshToken), refreshExpiresAt()]
    );

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    await activityLogger.log(user.institute_id, user.id, 'LOGIN', 'user', user.id, null, null, req.ip);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          instituteId: user.institute_id,
          canCollectFees: user.can_collect_fees,
          canEditAttendance: user.can_edit_attendance,
        }
      }
    });
  } catch (err) { next(err); }
}

async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    let decoded;
    try { decoded = verifyRefresh(refreshToken); }
    catch { return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' }); }

    const tokenHash = hashToken(refreshToken);
    const [rows] = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    );
    if (!rows.length) return res.status(401).json({ success: false, message: 'Refresh token not found or expired' });

    // Rotate token
    await db.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);

    const [userRows] = await db.query('SELECT * FROM users WHERE id = ? AND is_active = 1', [decoded.userId]);
    if (!userRows.length) return res.status(401).json({ success: false, message: 'User not found' });

    const payload = { userId: decoded.userId, instituteId: decoded.instituteId, role: decoded.role };
    const newAccess  = signAccess(payload);
    const newRefresh = signRefresh(payload);

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [decoded.userId, hashToken(newRefresh), refreshExpiresAt()]
    );

    res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } });
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await db.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [hashToken(refreshToken)]);
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
}

async function me(req, res) {
  const user = req.user;
  let staffData = {};
  if (user.role === 'staff') {
    const [sp] = await db.query('SELECT * FROM staff_profiles WHERE user_id = ?', [user.id]);
    if (sp.length) staffData = { canCollectFees: sp[0].can_collect_fees, canEditAttendance: sp[0].can_edit_attendance, staffProfileId: sp[0].id };
  }
  res.json({ success: true, data: { ...user, ...staffData } });
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    // Invalidate all refresh tokens
    await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);

    await activityLogger.log(req.user.institute_id, req.user.id, 'CHANGE_PASSWORD', 'user', req.user.id, null, null, req.ip);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
}

module.exports = { login, refreshToken, logout, me, changePassword };
