const db = require('../config/database');
const activityLogger = require('../utils/activityLogger');

// ========= FEE PLANS =========
async function listFeePlans(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { status } = req.query;
    let where = 'institute_id = ?';
    const params = [institute_id];
    if (status) { where += ' AND status = ?'; params.push(status); }
    const [plans] = await db.query(`SELECT * FROM fee_plans WHERE ${where} ORDER BY name`, params);
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
}

async function createFeePlan(req, res, next) {
  try {
    const { institute_id, id: userId } = req.user;
    const { name, description, amount, frequency, due_day, late_fee_amount, late_fee_after_days, discount_amount, discount_type } = req.body;
    const [result] = await db.query(
      `INSERT INTO fee_plans (institute_id, name, description, amount, frequency, due_day, late_fee_amount, late_fee_after_days, discount_amount, discount_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institute_id, name, description||null, amount, frequency||'monthly', due_day||null,
       late_fee_amount||0, late_fee_after_days||0, discount_amount||0, discount_type||'flat']
    );
    await activityLogger.log(institute_id, userId, 'CREATE_FEE_PLAN', 'fee_plan', result.insertId, null, req.body, req.ip);
    const [rows] = await db.query('SELECT * FROM fee_plans WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function updateFeePlan(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    const { name, description, amount, frequency, due_day, late_fee_amount, late_fee_after_days, discount_amount, discount_type, status } = req.body;
    await db.query(
      `UPDATE fee_plans SET name=?, description=?, amount=?, frequency=?, due_day=?, late_fee_amount=?, late_fee_after_days=?, discount_amount=?, discount_type=?, status=?
       WHERE id=? AND institute_id=?`,
      [name, description||null, amount, frequency||'monthly', due_day||null,
       late_fee_amount||0, late_fee_after_days||0, discount_amount||0, discount_type||'flat', status||'active', id, institute_id]
    );
    await activityLogger.log(institute_id, userId, 'UPDATE_FEE_PLAN', 'fee_plan', id, null, req.body, req.ip);
    const [rows] = await db.query('SELECT * FROM fee_plans WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

// ========= FEE RECORDS =========
async function listFeeRecords(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { member_id, status, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'fr.institute_id = ?';
    const params = [institute_id];
    if (member_id) { where += ' AND fr.member_id = ?'; params.push(member_id); }
    if (status) { where += ' AND fr.status = ?'; params.push(status); }
    if (from_date) { where += ' AND fr.due_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND fr.due_date <= ?'; params.push(to_date); }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM fee_records fr WHERE ${where}`, params);
    const [records] = await db.query(
      `SELECT fr.*, m.full_name as member_name, m.member_code, fp.name as fee_plan_name
       FROM fee_records fr
       JOIN members m ON m.id = fr.member_id
       LEFT JOIN fee_plans fp ON fp.id = fr.fee_plan_id
       WHERE ${where}
       ORDER BY fr.due_date DESC LIMIT ? OFFSET ?`,
      [...params, +limit, +offset]
    );
    res.json({ success: true, data: records, pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function createFeeRecord(req, res, next) {
  try {
    const { institute_id, id: userId } = req.user;
    const { member_id, enrollment_id, fee_plan_id, billing_period_label, original_amount, discount_amount, late_fee_amount, due_date, notes } = req.body;

    const disc = parseFloat(discount_amount || 0);
    const late = parseFloat(late_fee_amount || 0);
    const orig = parseFloat(original_amount);
    const final_amount = orig - disc + late;

    const [result] = await db.query(
      `INSERT INTO fee_records (institute_id, member_id, enrollment_id, fee_plan_id, billing_period_label, original_amount, discount_amount, late_fee_amount, final_amount, due_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institute_id, member_id, enrollment_id||null, fee_plan_id||null, billing_period_label||null,
       orig, disc, late, final_amount, due_date||null, notes||null, userId]
    );
    await activityLogger.log(institute_id, userId, 'CREATE_FEE_RECORD', 'fee_record', result.insertId, null, req.body, req.ip);
    const [rows] = await db.query('SELECT * FROM fee_records WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function updateFeeRecord(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    const { discount_amount, late_fee_amount, notes, status } = req.body;

    const [rows] = await db.query('SELECT * FROM fee_records WHERE id = ? AND institute_id = ?', [id, institute_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Fee record not found' });

    const fr = rows[0];
    const disc = parseFloat(discount_amount ?? fr.discount_amount);
    const late = parseFloat(late_fee_amount ?? fr.late_fee_amount);
    const final_amount = parseFloat(fr.original_amount) - disc + late;

    let newStatus = status || fr.status;
    if (fr.amount_paid >= final_amount && final_amount > 0) newStatus = 'paid';
    else if (fr.amount_paid > 0 && fr.amount_paid < final_amount) newStatus = 'partially_paid';

    await db.query(
      'UPDATE fee_records SET discount_amount=?, late_fee_amount=?, final_amount=?, notes=?, status=? WHERE id=?',
      [disc, late, final_amount, notes||fr.notes, newStatus, id]
    );
    await activityLogger.log(institute_id, userId, 'UPDATE_FEE_RECORD', 'fee_record', id, fr, req.body, req.ip);
    const [updated] = await db.query('SELECT * FROM fee_records WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) { next(err); }
}

module.exports = { listFeePlans, createFeePlan, updateFeePlan, listFeeRecords, createFeeRecord, updateFeeRecord };
