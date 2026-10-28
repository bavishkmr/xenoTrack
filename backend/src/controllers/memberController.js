const db = require('../config/database');
const activityLogger = require('../utils/activityLogger');
const { generateCode } = require('../utils/helpers');

async function list(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { search, status, program_id, group_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = ['m.institute_id = ?'];
    const params = [institute_id];

    if (search) {
      where.push('(m.full_name LIKE ? OR m.member_code LIKE ? OR m.phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { where.push('m.status = ?'); params.push(status); }
    if (program_id) {
      where.push('EXISTS (SELECT 1 FROM enrollments e WHERE e.member_id = m.id AND e.program_id = ? AND e.status = "active")');
      params.push(program_id);
    }
    if (group_id) {
      where.push('EXISTS (SELECT 1 FROM enrollments e WHERE e.member_id = m.id AND e.group_id = ? AND e.status = "active")');
      params.push(group_id);
    }

    const whereStr = where.join(' AND ');
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM members m WHERE ${whereStr}`, params);
    const [members] = await db.query(
      `SELECT m.id, m.member_code, m.full_name, m.phone, m.email, m.gender, m.status, m.registration_date, m.profile_photo,
              GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') as programs
       FROM members m
       LEFT JOIN enrollments e ON e.member_id = m.id AND e.status = 'active'
       LEFT JOIN programs p ON p.id = e.program_id
       WHERE ${whereStr}
       GROUP BY m.id
       ORDER BY m.full_name
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: members, pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id } = req.user;
    const [rows] = await db.query('SELECT * FROM members WHERE id = ? AND institute_id = ?', [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Member not found' });

    const member = rows[0];
    const [enrollments] = await db.query(
      `SELECT e.*, p.name as program_name, g.name as group_name, fp.name as fee_plan_name
       FROM enrollments e
       LEFT JOIN programs p ON p.id = e.program_id
       LEFT JOIN \`groups\` g ON g.id = e.group_id
       LEFT JOIN fee_plans fp ON fp.id = e.fee_plan_id
       WHERE e.member_id = ?`, [id]);
    const [feeRecords] = await db.query(
      `SELECT * FROM fee_records WHERE member_id = ? ORDER BY due_date DESC LIMIT 10`, [id]);
    const [payments] = await db.query(
      `SELECT p.*, u.full_name as collected_by_name FROM payments p
       JOIN users u ON u.id = p.collected_by
       WHERE p.member_id = ? ORDER BY p.payment_date DESC LIMIT 10`, [id]);

    res.json({ success: true, data: { ...member, enrollments, feeRecords, payments } });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { institute_id, id: userId } = req.user;
    const { full_name, phone, email, dob, gender, address, emergency_contact, notes, registration_date } = req.body;

    // Generate member code
    const [[{ maxId }]] = await db.query('SELECT MAX(id) as maxId FROM members WHERE institute_id = ?', [institute_id]);
    const [settingRows] = await db.query(
      "SELECT setting_value FROM institute_settings WHERE institute_id = ? AND setting_key = 'member_code_prefix'",
      [institute_id]
    );
    const prefix = settingRows[0]?.setting_value || 'MEM';
    const memberCode = generateCode(prefix, (maxId || 0) + 1);

    const [result] = await db.query(
      `INSERT INTO members (institute_id, member_code, full_name, phone, email, dob, gender, address, emergency_contact, notes, registration_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institute_id, memberCode, full_name, phone || null, email || null, dob || null, gender || null,
       address || null, emergency_contact || null, notes || null, registration_date || new Date().toISOString().slice(0,10), userId]
    );

    await activityLogger.log(institute_id, userId, 'CREATE_MEMBER', 'member', result.insertId, null, { full_name, memberCode }, req.ip);
    const [newMember] = await db.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newMember[0], message: 'Member created successfully' });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    const [rows] = await db.query('SELECT * FROM members WHERE id = ? AND institute_id = ?', [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Member not found' });

    const { full_name, phone, email, dob, gender, address, emergency_contact, notes } = req.body;
    await db.query(
      `UPDATE members SET full_name=?, phone=?, email=?, dob=?, gender=?, address=?, emergency_contact=?, notes=?, updated_at=NOW()
       WHERE id=?`,
      [full_name, phone || null, email || null, dob || null, gender || null, address || null, emergency_contact || null, notes || null, id]
    );
    await activityLogger.log(institute_id, userId, 'UPDATE_MEMBER', 'member', id, rows[0], req.body, req.ip);
    const [updated] = await db.query('SELECT * FROM members WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0], message: 'Member updated' });
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    const { status } = req.body;
    const valid = ['active','inactive','suspended','completed'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const [rows] = await db.query('SELECT * FROM members WHERE id = ? AND institute_id = ?', [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Member not found' });

    await db.query('UPDATE members SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
    await activityLogger.log(institute_id, userId, 'UPDATE_MEMBER_STATUS', 'member', id, { status: rows[0].status }, { status }, req.ip);
    res.json({ success: true, message: `Member status updated to ${status}` });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, updateStatus };
