const db = require('../config/database');

async function getAttendanceReport(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { from_date, to_date, group_id, program_id, member_id, report_type = 'summary' } = req.query;

    let where = 's.institute_id = ?';
    const params = [institute_id];
    if (from_date) { where += ' AND s.session_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND s.session_date <= ?'; params.push(to_date); }
    if (group_id) { where += ' AND s.group_id = ?'; params.push(group_id); }
    if (program_id) {
      where += ' AND s.group_id IN (SELECT id FROM `groups` WHERE program_id = ?)';
      params.push(program_id);
    }
    if (member_id) { where += ' AND ar.member_id = ?'; params.push(member_id); }

    if (report_type === 'member') {
      const [data] = await db.query(
        `SELECT m.member_code, m.full_name, g.name as group_name,
                COUNT(ar.id) as total_sessions,
                SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN ar.status='absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN ar.status='late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN ar.status='excused' THEN 1 ELSE 0 END) as excused,
                ROUND(SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(ar.id),0),1) as attendance_pct
         FROM attendance_records ar
         JOIN attendance_sessions s ON s.id = ar.session_id
         JOIN members m ON m.id = ar.member_id
         JOIN \`groups\` g ON g.id = s.group_id
         WHERE ${where}
         GROUP BY m.id, g.id ORDER BY m.full_name`, params
      );
      return res.json({ success: true, data });
    }

    if (report_type === 'daily') {
      const [data] = await db.query(
        `SELECT s.session_date as date, g.name as group_name,
                COUNT(DISTINCT ar.member_id) as total_marked,
                SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN ar.status='absent' THEN 1 ELSE 0 END) as absent
         FROM attendance_sessions s
         JOIN \`groups\` g ON g.id = s.group_id
         LEFT JOIN attendance_records ar ON ar.session_id = s.id
         WHERE ${where}
         GROUP BY s.session_date, s.group_id ORDER BY s.session_date DESC`, params
      );
      return res.json({ success: true, data });
    }

    // Default: group summary
    const [data] = await db.query(
      `SELECT g.name as group_name, p.name as program_name,
              COUNT(DISTINCT s.id) as total_sessions,
              COUNT(ar.id) as total_records,
              SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present,
              ROUND(SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(ar.id),0),1) as attendance_pct
       FROM attendance_sessions s
       JOIN \`groups\` g ON g.id = s.group_id
       JOIN programs p ON p.id = g.program_id
       LEFT JOIN attendance_records ar ON ar.session_id = s.id
       WHERE ${where}
       GROUP BY g.id ORDER BY g.name`, params
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getCollectionReport(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { from_date, to_date, group_id, program_id, staff_id, payment_method } = req.query;

    let where = 'p.institute_id = ? AND p.is_reversed = 0';
    const params = [institute_id];
    if (from_date) { where += ' AND p.payment_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND p.payment_date <= ?'; params.push(to_date); }
    if (payment_method) { where += ' AND p.payment_method = ?'; params.push(payment_method); }
    if (staff_id) { where += ' AND p.collected_by = ?'; params.push(staff_id); }

    // Daily collection summary
    const [daily] = await db.query(
      `SELECT p.payment_date as date,
              COUNT(*) as payment_count,
              SUM(p.amount) as total_collected
       FROM payments p WHERE ${where}
       GROUP BY p.payment_date ORDER BY p.payment_date DESC`, params
    );

    // Payment method summary
    const [byMethod] = await db.query(
      `SELECT p.payment_method, COUNT(*) as count, SUM(p.amount) as total
       FROM payments p WHERE ${where}
       GROUP BY p.payment_method`, params
    );

    // Staff collection
    const [byStaff] = await db.query(
      `SELECT u.full_name as staff_name, COUNT(*) as payment_count, SUM(p.amount) as total
       FROM payments p JOIN users u ON u.id = p.collected_by
       WHERE ${where}
       GROUP BY p.collected_by`, params
    );

    const [[{ grandTotal }]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) as grandTotal FROM payments p WHERE ${where}`, params
    );

    res.json({ success: true, data: { daily, byMethod, byStaff, grandTotal } });
  } catch (err) { next(err); }
}

async function getOutstandingReport(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { status, program_id, group_id } = req.query;

    let where = 'fr.institute_id = ? AND fr.status NOT IN ("paid","waived")';
    const params = [institute_id];
    if (status) { where += ' AND fr.status = ?'; params.push(status); }

    const [records] = await db.query(
      `SELECT fr.*, m.full_name as member_name, m.member_code, m.phone,
              fp.name as fee_plan_name,
              DATEDIFF(CURDATE(), fr.due_date) as days_overdue
       FROM fee_records fr
       JOIN members m ON m.id = fr.member_id
       LEFT JOIN fee_plans fp ON fp.id = fr.fee_plan_id
       WHERE ${where}
       ORDER BY fr.due_date ASC`, params
    );

    const [[{ totalOutstanding }]] = await db.query(
      `SELECT COALESCE(SUM(outstanding_balance),0) as totalOutstanding FROM fee_records fr
       WHERE ${where}`, params
    );

    res.json({ success: true, data: { records, totalOutstanding } });
  } catch (err) { next(err); }
}

module.exports = { getAttendanceReport, getCollectionReport, getOutstandingReport };
