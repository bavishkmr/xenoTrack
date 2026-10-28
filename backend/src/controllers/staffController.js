const bcrypt = require('bcryptjs');
const db = require('../config/database');
const activityLogger = require('../utils/activityLogger');
const { generateCode } = require('../utils/helpers');

async function list(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { status, search } = req.query;
    let where = 'sp.institute_id = ?';
    const params = [institute_id];
    if (status) { where += ' AND sp.status = ?'; params.push(status); }
    if (search) {
      where += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR sp.staff_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const [staff] = await db.query(
      `SELECT sp.*, u.full_name, u.email, u.phone, u.is_active,
              STRING_AGG(DISTINCT g.name, ', ' ORDER BY g.name) as assigned_groups
       FROM staff_profiles sp
       JOIN users u ON u.id = sp.user_id
       LEFT JOIN group_staff_assignments gsa ON gsa.staff_profile_id = sp.id
       LEFT JOIN \`groups\` g ON g.id = gsa.group_id AND g.status = 'active'
       WHERE ${where}
       GROUP BY sp.id ORDER BY u.full_name`, params);
    res.json({ success: true, data: staff });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id } = req.user;
    const [rows] = await db.query(
      `SELECT sp.*, u.full_name, u.email, u.phone, u.is_active, u.last_login
       FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
       WHERE sp.id = ? AND sp.institute_id = ?`, [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Staff not found' });
    const [groups] = await db.query(
      `SELECT g.id, g.name, p.name as program_name, gsa.is_primary
       FROM group_staff_assignments gsa
       JOIN \`groups\` g ON g.id = gsa.group_id
       JOIN programs p ON p.id = g.program_id
       WHERE gsa.staff_profile_id = ?`, [id]);
    res.json({ success: true, data: { ...rows[0], groups } });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { institute_id, id: adminId } = req.user;
    const { full_name, email, phone, password, designation, joining_date, can_collect_fees, can_edit_attendance } = req.body;

    // Check email uniqueness
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND institute_id = ?', [email.toLowerCase(), institute_id]);
    if (existing.length) return res.status(409).json({ success: false, message: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const [userResult] = await db.query(
      "INSERT INTO users (institute_id, email, password_hash, role, full_name, phone) VALUES (?, ?, ?, 'staff', ?, ?)",
      [institute_id, email.toLowerCase(), hash, full_name, phone || null]
    );
    const userId = userResult.insertId;

    // Generate staff code
    const [[{ maxId }]] = await db.query('SELECT MAX(id) as maxId FROM staff_profiles WHERE institute_id = ?', [institute_id]);
    const [settingRows] = await db.query(
      "SELECT setting_value FROM institute_settings WHERE institute_id = ? AND setting_key = 'staff_code_prefix'",
      [institute_id]
    );
    const prefix = settingRows[0]?.setting_value || 'STF';
    const staffCode = generateCode(prefix, (maxId || 0) + 1);

    const [spResult] = await db.query(
      `INSERT INTO staff_profiles (user_id, institute_id, staff_code, designation, joining_date, can_collect_fees, can_edit_attendance)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, institute_id, staffCode, designation || null, joining_date || null,
       can_collect_fees ? 1 : 0, can_edit_attendance !== false ? 1 : 0]
    );
    await activityLogger.log(institute_id, adminId, 'CREATE_STAFF', 'staff_profile', spResult.insertId, null, { full_name, email }, req.ip);
    const [created] = await db.query(
      'SELECT sp.*, u.full_name, u.email, u.phone FROM staff_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = ?',
      [spResult.insertId]);
    res.status(201).json({ success: true, data: created[0], message: 'Staff created successfully' });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: adminId } = req.user;
    const { full_name, phone, designation, joining_date, can_collect_fees, can_edit_attendance, status } = req.body;

    const [rows] = await db.query('SELECT user_id FROM staff_profiles WHERE id = ? AND institute_id = ?', [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Staff not found' });

    await db.query('UPDATE users SET full_name=?, phone=? WHERE id=?', [full_name, phone||null, rows[0].user_id]);
    await db.query(
      'UPDATE staff_profiles SET designation=?, joining_date=?, can_collect_fees=?, can_edit_attendance=?, status=? WHERE id=?',
      [designation||null, joining_date||null, can_collect_fees?1:0, can_edit_attendance?1:0, status||'active', id]
    );
    await activityLogger.log(institute_id, adminId, 'UPDATE_STAFF', 'staff_profile', id, null, req.body, req.ip);
    const [updated] = await db.query(
      'SELECT sp.*, u.full_name, u.email, u.phone FROM staff_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: adminId } = req.user;
    const { new_password } = req.body;

    const [rows] = await db.query('SELECT user_id FROM staff_profiles WHERE id = ? AND institute_id = ?', [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Staff not found' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, rows[0].user_id]);
    await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [rows[0].user_id]);
    await activityLogger.log(institute_id, adminId, 'RESET_STAFF_PASSWORD', 'staff_profile', id, null, null, req.ip);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, resetPassword };
