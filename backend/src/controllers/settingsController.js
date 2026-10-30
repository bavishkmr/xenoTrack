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
           ON CONFLICT (institute_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by`,
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

async function getGenderOptions(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { status } = req.query;

    let where = 'institute_id = ?';
    const params = [institute_id];
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    let [options] = await db.query(
      `SELECT * FROM gender_options WHERE ${where} ORDER BY display_order ASC, name ASC`,
      params
    );

    // If no gender options exist for this institute yet, auto-seed standard defaults
    if (!options.length && !status) {
      const defaults = ['Male', 'Female', 'Other', 'Prefer not to say'];
      for (let i = 0; i < defaults.length; i++) {
        await db.query(
          `INSERT INTO gender_options (institute_id, name, status, display_order)
           VALUES (?, ?, 'active', ?)
           ON CONFLICT DO NOTHING`,
          [institute_id, defaults[i], i + 1]
        );
      }
      [options] = await db.query(
        'SELECT * FROM gender_options WHERE institute_id = ? ORDER BY display_order ASC, name ASC',
        [institute_id]
      );
    }

    res.json({ success: true, data: options });
  } catch (err) { next(err); }
}

async function createGenderOption(req, res, next) {
  try {
    const { institute_id, id: userId } = req.user;
    let { name, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Gender option name is required' });
    }
    name = name.trim();
    status = status === 'inactive' ? 'inactive' : 'active';

    // Duplicate check
    const [existing] = await db.query(
      'SELECT id FROM gender_options WHERE institute_id = ? AND LOWER(name) = LOWER(?)',
      [institute_id, name]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: `Gender option "${name}" already exists` });
    }

    // Get next display order
    const [[{ nextOrder }]] = await db.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as nextOrder FROM gender_options WHERE institute_id = ?',
      [institute_id]
    );

    const [result] = await db.query(
      'INSERT INTO gender_options (institute_id, name, status, display_order) VALUES (?, ?, ?, ?) RETURNING *',
      [institute_id, name, status, nextOrder || 1]
    );

    const created = result[0] || { id: result.insertId, name, status, display_order: nextOrder || 1 };
    await activityLogger.log(institute_id, userId, 'CREATE_GENDER_OPTION', 'gender_option', created.id, null, { name, status }, req.ip);

    res.status(201).json({ success: true, data: created, message: 'Gender option created successfully' });
  } catch (err) { next(err); }
}

async function updateGenderOption(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    let { name, status, display_order } = req.body;

    const [rows] = await db.query('SELECT * FROM gender_options WHERE id = ? AND institute_id = ?', [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Gender option not found' });
    const oldOption = rows[0];

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Gender option name cannot be empty' });
      }
      name = name.trim();

      // Duplicate check
      const [duplicate] = await db.query(
        'SELECT id FROM gender_options WHERE institute_id = ? AND LOWER(name) = LOWER(?) AND id != ?',
        [institute_id, name, id]
      );
      if (duplicate.length) {
        return res.status(409).json({ success: false, message: `Gender option "${name}" already exists` });
      }
    } else {
      name = oldOption.name;
    }

    const newStatus = status ? (status === 'inactive' ? 'inactive' : 'active') : oldOption.status;
    const newOrder = display_order !== undefined ? parseInt(display_order, 10) : oldOption.display_order;

    await db.query(
      'UPDATE gender_options SET name = ?, status = ?, display_order = ?, updated_at = NOW() WHERE id = ? AND institute_id = ?',
      [name, newStatus, newOrder, id, institute_id]
    );

    const [updated] = await db.query('SELECT * FROM gender_options WHERE id = ?', [id]);
    await activityLogger.log(institute_id, userId, 'UPDATE_GENDER_OPTION', 'gender_option', id, oldOption, { name, status: newStatus }, req.ip);

    res.json({ success: true, data: updated[0], message: 'Gender option updated successfully' });
  } catch (err) { next(err); }
}

async function toggleGenderOptionStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    const { status } = req.body;

    const [rows] = await db.query('SELECT * FROM gender_options WHERE id = ? AND institute_id = ?', [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Gender option not found' });
    const opt = rows[0];

    const nextStatus = status ? (status === 'active' ? 'active' : 'inactive') : (opt.status === 'active' ? 'inactive' : 'active');

    await db.query(
      'UPDATE gender_options SET status = ?, updated_at = NOW() WHERE id = ? AND institute_id = ?',
      [nextStatus, id, institute_id]
    );

    await activityLogger.log(institute_id, userId, 'TOGGLE_GENDER_OPTION_STATUS', 'gender_option', id, { status: opt.status }, { status: nextStatus }, req.ip);

    const [updated] = await db.query('SELECT * FROM gender_options WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0], message: `Gender option is now ${nextStatus}` });
  } catch (err) { next(err); }
}

async function deleteGenderOption(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;

    const [rows] = await db.query('SELECT * FROM gender_options WHERE id = ? AND institute_id = ?', [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Gender option not found' });
    const opt = rows[0];

    // Check if any member is assigned to this gender option (case-insensitive check)
    const [[{ memberCount }]] = await db.query(
      'SELECT COUNT(*) as memberCount FROM members WHERE institute_id = ? AND LOWER(gender) = LOWER(?)',
      [institute_id, opt.name]
    );

    if (memberCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${opt.name}" because ${memberCount} member(s) are currently assigned to it. Please reassign them or disable this option instead.`
      });
    }

    await db.query('DELETE FROM gender_options WHERE id = ? AND institute_id = ?', [id, institute_id]);
    await activityLogger.log(institute_id, userId, 'DELETE_GENDER_OPTION', 'gender_option', id, opt, null, req.ip);

    res.json({ success: true, message: 'Gender option deleted successfully' });
  } catch (err) { next(err); }
}

async function reorderGenderOptions(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { institute_id, id: userId } = req.user;
    const { items } = req.body; // [{ id, display_order }]

    if (Array.isArray(items)) {
      for (const item of items) {
        await conn.query(
          'UPDATE gender_options SET display_order = ?, updated_at = NOW() WHERE id = ? AND institute_id = ?',
          [parseInt(item.display_order, 10), item.id, institute_id]
        );
      }
    }

    await conn.commit();
    await activityLogger.log(institute_id, userId, 'REORDER_GENDER_OPTIONS', 'gender_option', null, null, { items }, req.ip);

    const [options] = await db.query(
      'SELECT * FROM gender_options WHERE institute_id = ? ORDER BY display_order ASC, name ASC',
      [institute_id]
    );
    res.json({ success: true, data: options, message: 'Gender options reordered successfully' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = {
  getSettings,
  updateSettings,
  getActivityLogs,
  getGenderOptions,
  createGenderOption,
  updateGenderOption,
  toggleGenderOptionStatus,
  deleteGenderOption,
  reorderGenderOptions,
};
