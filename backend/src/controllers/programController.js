const db = require('../config/database');
const activityLogger = require('../utils/activityLogger');

// ========= PROGRAMS =========
async function listPrograms(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { status } = req.query;
    let where = 'p.institute_id = ?';
    const params = [institute_id];
    if (status) { where += ' AND p.status = ?'; params.push(status); }
    const [programs] = await db.query(
      `SELECT p.*, fp.name as default_fee_plan_name,
              COUNT(DISTINCT g.id) as group_count,
              COUNT(DISTINCT e.member_id) as member_count
       FROM programs p
       LEFT JOIN fee_plans fp ON fp.id = p.default_fee_plan_id
       LEFT JOIN \`groups\` g ON g.program_id = p.id AND g.status = 'active'
       LEFT JOIN enrollments e ON e.program_id = p.id AND e.status = 'active'
       WHERE ${where}
       GROUP BY p.id, fp.name ORDER BY p.name`, params);
    res.json({ success: true, data: programs });
  } catch (err) { next(err); }
}

async function createProgram(req, res, next) {
  try {
    const { institute_id, id: userId } = req.user;
    const { name, description, program_type, default_fee_plan_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO programs (institute_id, name, description, program_type, default_fee_plan_id) VALUES (?, ?, ?, ?, ?)',
      [institute_id, name, description || null, program_type || null, default_fee_plan_id || null]
    );
    await activityLogger.log(institute_id, userId, 'CREATE_PROGRAM', 'program', result.insertId, null, req.body, req.ip);
    const [rows] = await db.query('SELECT * FROM programs WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function updateProgram(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    const { name, description, program_type, default_fee_plan_id, status } = req.body;
    await db.query(
      'UPDATE programs SET name=?, description=?, program_type=?, default_fee_plan_id=?, status=? WHERE id=? AND institute_id=?',
      [name, description||null, program_type||null, default_fee_plan_id ? parseInt(default_fee_plan_id, 10) : null, status||'active', id, institute_id]
    );
    await activityLogger.log(institute_id, userId, 'UPDATE_PROGRAM', 'program', id, null, req.body, req.ip);
    const [rows] = await db.query('SELECT * FROM programs WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

// ========= GROUPS =========
async function listGroups(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { program_id, status, staff_id } = req.query;
    let where = 'g.institute_id = ?';
    const params = [institute_id];
    if (program_id) { where += ' AND g.program_id = ?'; params.push(program_id); }
    if (status) { where += ' AND g.status = ?'; params.push(status); }
    if (staff_id) {
      where += ' AND EXISTS (SELECT 1 FROM group_staff_assignments gsa WHERE gsa.group_id = g.id AND gsa.staff_profile_id = ?)';
      params.push(staff_id);
    }
    const [groups] = await db.query(
      `SELECT g.*, p.name as program_name,
              COUNT(DISTINCT e.member_id) as member_count,
              STRING_AGG(DISTINCT u.full_name, ', ' ORDER BY u.full_name) as staff_names
       FROM \`groups\` g
       JOIN programs p ON p.id = g.program_id
       LEFT JOIN enrollments e ON e.group_id = g.id AND e.status = 'active'
       LEFT JOIN group_staff_assignments gsa ON gsa.group_id = g.id
       LEFT JOIN staff_profiles sp ON sp.id = gsa.staff_profile_id
       LEFT JOIN users u ON u.id = sp.user_id
       WHERE ${where}
       GROUP BY g.id, p.name ORDER BY g.name`, params);
    res.json({ success: true, data: groups });
  } catch (err) { next(err); }
}

async function getGroupById(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id } = req.user;
    const [rows] = await db.query(
      `SELECT g.*, p.name as program_name FROM \`groups\` g
       JOIN programs p ON p.id = g.program_id
       WHERE g.id = ? AND g.institute_id = ?`, [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Group not found' });

    const [staff] = await db.query(
      `SELECT sp.id as staff_profile_id, u.full_name, sp.designation, gsa.is_primary
       FROM group_staff_assignments gsa
       JOIN staff_profiles sp ON sp.id = gsa.staff_profile_id
       JOIN users u ON u.id = sp.user_id
       WHERE gsa.group_id = ?`, [id]);
    const [members] = await db.query(
      `SELECT m.id, m.member_code, m.full_name, m.phone, m.status, e.status as enrollment_status, e.id as enrollment_id
       FROM enrollments e JOIN members m ON m.id = e.member_id
       WHERE e.group_id = ? ORDER BY m.full_name`, [id]);

    res.json({ success: true, data: { ...rows[0], staff, members } });
  } catch (err) { next(err); }
}

async function createGroup(req, res, next) {
  try {
    const { institute_id, id: userId } = req.user;
    const { program_id, name, start_date, end_date, scheduled_days, start_time, end_time, capacity } = req.body;
    const schedDays = typeof scheduled_days === 'string' ? scheduled_days : JSON.stringify(scheduled_days || []);
    const [result] = await db.query(
      `INSERT INTO \`groups\` (institute_id, program_id, name, start_date, end_date, scheduled_days, start_time, end_time, capacity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institute_id, program_id, name, start_date||null, end_date||null,
       schedDays, start_time||null, end_time||null, capacity ? parseInt(capacity, 10) : null]
    );
    await activityLogger.log(institute_id, userId, 'CREATE_GROUP', 'group', result.insertId, null, req.body, req.ip);
    const [rows] = await db.query('SELECT * FROM `groups` WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function updateGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    const { name, start_date, end_date, scheduled_days, start_time, end_time, capacity, status } = req.body;
    const schedDays = typeof scheduled_days === 'string' ? scheduled_days : JSON.stringify(scheduled_days || []);
    await db.query(
      `UPDATE \`groups\` SET name=?, start_date=?, end_date=?, scheduled_days=?, start_time=?, end_time=?, capacity=?, status=?
       WHERE id=? AND institute_id=?`,
      [name, start_date||null, end_date||null, schedDays,
       start_time||null, end_time||null, capacity ? parseInt(capacity, 10) : null, status||'active', id, institute_id]
    );
    await activityLogger.log(institute_id, userId, 'UPDATE_GROUP', 'group', id, null, req.body, req.ip);
    const [rows] = await db.query('SELECT * FROM `groups` WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function assignStaff(req, res, next) {
  try {
    const { id: groupId } = req.params;
    const { institute_id, id: userId } = req.user;
    const { staff_profile_id, is_primary } = req.body;
    // Verify group belongs to institute
    const [g] = await db.query('SELECT id FROM `groups` WHERE id = ? AND institute_id = ?', [groupId, institute_id]);
    if (!g.length) return res.status(404).json({ success: false, message: 'Group not found' });

    await db.query(
      'INSERT INTO group_staff_assignments (group_id, staff_profile_id, is_primary) VALUES (?, ?, ?) ON CONFLICT (group_id, staff_profile_id) DO UPDATE SET is_primary = EXCLUDED.is_primary',
      [groupId, staff_profile_id, is_primary ? true : false]
    );
    res.json({ success: true, message: 'Staff assigned to group' });
  } catch (err) { next(err); }
}

async function removeStaff(req, res, next) {
  try {
    const { id: groupId, staffId } = req.params;
    const { institute_id } = req.user;
    const [g] = await db.query('SELECT id FROM `groups` WHERE id = ? AND institute_id = ?', [groupId, institute_id]);
    if (!g.length) return res.status(404).json({ success: false, message: 'Group not found' });
    await db.query('DELETE FROM group_staff_assignments WHERE group_id = ? AND staff_profile_id = ?', [groupId, staffId]);
    res.json({ success: true, message: 'Staff removed from group' });
  } catch (err) { next(err); }
}

// ========= ENROLLMENTS =========
async function enroll(req, res, next) {
  try {
    const { institute_id, id: userId } = req.user;
    const { member_id, program_id, group_id, fee_plan_id, notes } = req.body;
    const [existing] = await db.query(
      'SELECT id FROM enrollments WHERE member_id=? AND program_id=? AND group_id IS NOT DISTINCT FROM ?',
      [member_id, program_id, group_id || null]
    );
    if (existing.length) return res.status(409).json({ success: false, message: 'Member already enrolled in this program/group' });

    const [result] = await db.query(
      'INSERT INTO enrollments (institute_id, member_id, program_id, group_id, fee_plan_id, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [institute_id, member_id, program_id, group_id||null, fee_plan_id||null, notes||null]
    );
    await activityLogger.log(institute_id, userId, 'ENROLL_MEMBER', 'enrollment', result.insertId, null, req.body, req.ip);
    res.status(201).json({ success: true, message: 'Member enrolled successfully' });
  } catch (err) { next(err); }
}

async function updateEnrollment(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id } = req.user;
    const { status, fee_plan_id, notes } = req.body;
    await db.query(
      'UPDATE enrollments SET status=?, fee_plan_id=?, notes=? WHERE id=? AND institute_id=?',
      [status, fee_plan_id||null, notes||null, id, institute_id]
    );
    res.json({ success: true, message: 'Enrollment updated' });
  } catch (err) { next(err); }
}

module.exports = { listPrograms, createProgram, updateProgram, listGroups, getGroupById, createGroup, updateGroup, assignStaff, removeStaff, enroll, updateEnrollment };
