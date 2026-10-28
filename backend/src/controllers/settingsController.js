const db = require('../config/database');
const activityLogger = require('../utils/activityLogger');

async function getSettings(req, res, next) {
  try {
    const { institute_id } = req.user;
    const [inst] = await db.query('SELECT * FROM institutes WHERE id = ?', [institute_id]);
    const [settings] = await db.query('SELECT setting_key, setting_value FROM institute_settings WHERE institute_id = ?', [institute_id]);
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
    res.json({ success: true, data: { institute: inst[0], settings: settingsMap } });
  } catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { institute_id, id: userId } = req.user;
    const { institute, settings } = req.body;

    if (institute) {
      const { name, address, phone, email, timezone, currency } = institute;
      await conn.query(
        'UPDATE institutes SET name=?, address=?, phone=?, email=?, timezone=?, currency=? WHERE id=?',
        [name, address||null, phone||null, email||null, timezone||'Asia/Kolkata', currency||'INR', institute_id]
      );
    }

    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        await conn.query(
          `INSERT INTO institute_settings (institute_id, setting_key, setting_value, updated_by)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
          [institute_id, key, value, userId]
        );
      }
    }

    await conn.commit();
    await activityLogger.log(institute_id, userId, 'UPDATE_SETTINGS', 'institute', institute_id, null, req.body, req.ip);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function getActivityLogs(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { user_id, action, entity_type, from_date, to_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'al.institute_id = ?';
    const params = [institute_id];
    if (user_id) { where += ' AND al.user_id = ?'; params.push(user_id); }
    if (action) { where += ' AND al.action LIKE ?'; params.push(`%${action}%`); }
    if (entity_type) { where += ' AND al.entity_type = ?'; params.push(entity_type); }
    if (from_date) { where += ' AND DATE(al.created_at) >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND DATE(al.created_at) <= ?'; params.push(to_date); }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM activity_logs al WHERE ${where}`, params);
    const [logs] = await db.query(
      `SELECT al.*, u.full_name as user_name, u.role
       FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id
       WHERE ${where}
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
      [...params, +limit, +offset]
    );
    res.json({ success: true, data: logs, pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

module.exports = { getSettings, updateSettings, getActivityLogs };
