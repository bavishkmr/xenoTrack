const db = require('../config/database');
const activityLogger = require('../utils/activityLogger');

// ========= SESSIONS =========
async function listSessions(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { group_id, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = 's.institute_id = ?';
    const params = [institute_id];
    if (group_id) { where += ' AND s.group_id = ?'; params.push(group_id); }
    if (from_date) { where += ' AND s.session_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND s.session_date <= ?'; params.push(to_date); }

    // Staff: only their groups
    if (req.user.role === 'staff') {
      const [sp] = await db.query('SELECT id FROM staff_profiles WHERE user_id = ?', [req.user.id]);
      if (sp.length) {
        where += ' AND s.group_id IN (SELECT group_id FROM group_staff_assignments WHERE staff_profile_id = ?)';
        params.push(sp[0].id);
      }
    }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM attendance_sessions s WHERE ${where}`, params);
    const [sessions] = await db.query(
      `SELECT s.*, g.name as group_name, p.name as program_name,
              u.full_name as created_by_name,
              COUNT(ar.id) as attendance_count,
              SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present_count
       FROM attendance_sessions s
       JOIN \`groups\` g ON g.id = s.group_id
       JOIN programs p ON p.id = g.program_id
       JOIN users u ON u.id = s.created_by
       LEFT JOIN attendance_records ar ON ar.session_id = s.id
       WHERE ${where}
       GROUP BY s.id, g.name, p.name, u.full_name
       ORDER BY s.session_date DESC, s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, +limit, +offset]
    );
    res.json({ success: true, data: sessions, pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function createSession(req, res, next) {
  try {
    const { institute_id, id: userId } = req.user;
    const { group_id, session_date, start_time, end_time, notes } = req.body;

    // Verify group
    const [grp] = await db.query('SELECT * FROM `groups` WHERE id = ? AND institute_id = ?', [group_id, institute_id]);
    if (!grp.length) return res.status(404).json({ success: false, message: 'Group not found' });

    // Check for existing session
    const [existing] = await db.query(
      'SELECT id FROM attendance_sessions WHERE group_id = ? AND session_date = ?', [group_id, session_date]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'A session already exists for this group on this date' });
    }

    const [result] = await db.query(
      'INSERT INTO attendance_sessions (institute_id, group_id, session_date, start_time, end_time, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [institute_id, group_id, session_date, start_time||null, end_time||null, notes||null, userId]
    );
    const [session] = await db.query('SELECT * FROM attendance_sessions WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: session[0] });
  } catch (err) { next(err); }
}

// ========= ATTENDANCE RECORDS =========
async function getSessionRecords(req, res, next) {
  try {
    const { session_id } = req.params;
    const { institute_id } = req.user;

    const [sess] = await db.query('SELECT * FROM attendance_sessions WHERE id = ? AND institute_id = ?', [session_id, institute_id]);
    if (!sess.length) return res.status(404).json({ success: false, message: 'Session not found' });

    // Get enrolled members for this group
    const [enrolled] = await db.query(
      `SELECT m.id, m.member_code, m.full_name, m.phone, m.profile_photo,
              ar.id as record_id, ar.status as attendance_status, ar.note,
              ar.marked_by, ar.marked_at, u.full_name as marked_by_name
       FROM enrollments e
       JOIN members m ON m.id = e.member_id
       LEFT JOIN attendance_records ar ON ar.session_id = ? AND ar.member_id = m.id
       LEFT JOIN users u ON u.id = ar.marked_by
       WHERE e.group_id = ? AND e.status = 'active'
       ORDER BY m.full_name`, [session_id, sess[0].group_id]
    );
    res.json({ success: true, data: { session: sess[0], records: enrolled } });
  } catch (err) { next(err); }
}

async function saveBulkAttendance(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { institute_id, id: userId } = req.user;
    const { session_id, records } = req.body;  // records: [{member_id, status, note}]

    const [sess] = await conn.query('SELECT * FROM attendance_sessions WHERE id = ? AND institute_id = ?', [session_id, institute_id]);
    if (!sess.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Session not found' }); }

    for (const rec of records) {
      await conn.query(
        `INSERT INTO attendance_records (session_id, member_id, status, note, marked_by)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (session_id, member_id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, modified_by = ?, modified_at = NOW()`,
        [session_id, rec.member_id, rec.status, rec.note||null, userId, userId]
      );
    }

    await conn.query("UPDATE attendance_sessions SET status = 'completed' WHERE id = ?", [session_id]);
    await conn.commit();
    await activityLogger.log(institute_id, userId, 'MARK_ATTENDANCE', 'attendance_session', session_id, null, { count: records.length }, req.ip);
    res.json({ success: true, message: `Attendance saved for ${records.length} members` });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function updateRecord(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    const { status, note } = req.body;

    // Check edit window if staff
    if (req.user.role === 'staff') {
      const [sp] = await db.query('SELECT * FROM staff_profiles WHERE user_id = ?', [userId]);
      if (sp.length && !sp[0].can_edit_attendance) {
        return res.status(403).json({ success: false, message: 'Not permitted to edit attendance' });
      }
      if (sp.length) {
        const windowHours = sp[0].attendance_edit_window_hours || 24;
        const [arRows] = await db.query(
          'SELECT ar.*, s.session_date FROM attendance_records ar JOIN attendance_sessions s ON s.id = ar.session_id WHERE ar.id = ?', [id]
        );
        if (arRows.length) {
          const sessionDateTime = new Date(arRows[0].session_date);
          sessionDateTime.setHours(23, 59, 59);
          const diffHours = (Date.now() - sessionDateTime.getTime()) / 3600000;
          if (diffHours > windowHours) {
            return res.status(403).json({ success: false, message: `Attendance can only be edited within ${windowHours} hours of the session` });
          }
        }
      }
    }

    await db.query(
      'UPDATE attendance_records SET status = ?, note = ?, modified_by = ?, modified_at = NOW() WHERE id = ?',
      [status, note||null, userId, id]
    );
    await activityLogger.log(institute_id, userId, 'EDIT_ATTENDANCE_RECORD', 'attendance_record', id, null, { status, note }, req.ip);
    res.json({ success: true, message: 'Attendance updated' });
  } catch (err) { next(err); }
}

module.exports = { listSessions, createSession, getSessionRecords, saveBulkAttendance, updateRecord };
