const db = require('../config/database');
const activityLogger = require('../utils/activityLogger');

async function list(req, res, next) {
  try {
    const { institute_id } = req.user;
    const { member_id, from_date, to_date, payment_method, collected_by, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'p.institute_id = ? AND p.is_reversed = 0';
    const params = [institute_id];
    if (member_id) { where += ' AND p.member_id = ?'; params.push(member_id); }
    if (from_date) { where += ' AND p.payment_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND p.payment_date <= ?'; params.push(to_date); }
    if (payment_method) { where += ' AND p.payment_method = ?'; params.push(payment_method); }
    if (collected_by) { where += ' AND p.collected_by = ?'; params.push(collected_by); }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM payments p WHERE ${where}`, params);
    const [payments] = await db.query(
      `SELECT p.*, m.full_name as member_name, m.member_code,
              u.full_name as collected_by_name,
              fr.billing_period_label, fr.final_amount as fee_amount
       FROM payments p
       JOIN members m ON m.id = p.member_id
       JOIN users u ON u.id = p.collected_by
       JOIN fee_records fr ON fr.id = p.fee_record_id
       WHERE ${where}
       ORDER BY p.payment_date DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, +limit, +offset]
    );
    res.json({ success: true, data: payments, pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { institute_id, id: userId } = req.user;
    const { fee_record_id, amount, payment_method, transaction_reference, payment_date, notes } = req.body;

    const [frRows] = await conn.query('SELECT * FROM fee_records WHERE id = ? AND institute_id = ? FOR UPDATE', [fee_record_id, institute_id]);
    if (!frRows.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Fee record not found' }); }

    const fr = frRows[0];
    if (fr.status === 'paid' || fr.status === 'waived') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Fee record is already ${fr.status}` });
    }
    const payAmt = parseFloat(amount);
    if (payAmt <= 0) { await conn.rollback(); return res.status(400).json({ success: false, message: 'Amount must be greater than 0' }); }
    if (payAmt > parseFloat(fr.outstanding_balance)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Payment amount (${payAmt}) exceeds outstanding balance (${fr.outstanding_balance})` });
    }

    // Generate receipt number
    const [settingRows] = await conn.query(
      "SELECT setting_value FROM institute_settings WHERE institute_id = ? AND setting_key = 'receipt_prefix'", [institute_id]
    );
    const prefix = settingRows[0]?.setting_value || 'RCP';
    const [[{ lastReceipt }]] = await conn.query(
      "SELECT MAX(id) as lastReceipt FROM payments WHERE institute_id = ?", [institute_id]
    );
    const receiptNumber = `${prefix}-${new Date().getFullYear()}-${String((lastReceipt || 0) + 1).padStart(6, '0')}`;

    const [payResult] = await conn.query(
      `INSERT INTO payments (institute_id, fee_record_id, member_id, amount, payment_method, transaction_reference, receipt_number, payment_date, collected_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institute_id, fee_record_id, fr.member_id, payAmt, payment_method||'cash',
       transaction_reference||null, receiptNumber, payment_date||new Date().toISOString().slice(0,10), userId, notes||null]
    );

    const newAmountPaid = parseFloat(fr.amount_paid) + payAmt;
    const outstanding = parseFloat(fr.final_amount) - newAmountPaid;
    let newStatus = outstanding <= 0 ? 'paid' : 'partially_paid';

    await conn.query(
      'UPDATE fee_records SET amount_paid = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [newAmountPaid, newStatus, fee_record_id]
    );

    await conn.commit();
    await activityLogger.log(institute_id, userId, 'RECORD_PAYMENT', 'payment', payResult.insertId, null, { amount: payAmt, receipt_number: receiptNumber }, req.ip);

    const [payment] = await db.query(
      `SELECT p.*, m.full_name as member_name, m.member_code, u.full_name as collected_by_name,
              fr.billing_period_label, fr.final_amount as fee_amount, fr.outstanding_balance
       FROM payments p
       JOIN members m ON m.id = p.member_id JOIN users u ON u.id = p.collected_by
       JOIN fee_records fr ON fr.id = p.fee_record_id
       WHERE p.id = ?`, [payResult.insertId]
    );
    res.status(201).json({ success: true, data: payment[0], message: 'Payment recorded successfully' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function getReceipt(req, res, next) {
  try {
    const { id } = req.params;
    const { institute_id } = req.user;
    const [rows] = await db.query(
      `SELECT p.*,
              m.full_name as member_name, m.member_code,
              u.full_name as collected_by_name,
              fr.billing_period_label, fr.final_amount, fr.amount_paid, fr.outstanding_balance,
              i.name as institute_name, i.address as institute_address, i.phone as institute_phone, i.logo_url,
              g.name as group_name, prog.name as program_name
       FROM payments p
       JOIN members m ON m.id = p.member_id
       JOIN users u ON u.id = p.collected_by
       JOIN fee_records fr ON fr.id = p.fee_record_id
       JOIN institutes i ON i.id = p.institute_id
       LEFT JOIN enrollments e ON e.id = fr.enrollment_id
       LEFT JOIN \`groups\` g ON g.id = e.group_id
       LEFT JOIN programs prog ON prog.id = e.program_id
       WHERE p.id = ? AND p.institute_id = ?`, [id, institute_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
}

async function reverse(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { institute_id, id: userId } = req.user;
    const { reason } = req.body;

    const [rows] = await conn.query('SELECT * FROM payments WHERE id = ? AND institute_id = ? FOR UPDATE', [id, institute_id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Payment not found' }); }
    const pay = rows[0];
    if (pay.is_reversed) { await conn.rollback(); return res.status(400).json({ success: false, message: 'Payment already reversed' }); }

    await conn.query('UPDATE payments SET is_reversed = 1 WHERE id = ?', [id]);
    await conn.query(
      'INSERT INTO payment_reversals (payment_id, reversed_by, reason) VALUES (?, ?, ?)',
      [id, userId, reason || null]
    );

    // Recalculate fee record
    const [frRows] = await conn.query('SELECT * FROM fee_records WHERE id = ? FOR UPDATE', [pay.fee_record_id]);
    const fr = frRows[0];
    const newPaid = Math.max(0, parseFloat(fr.amount_paid) - parseFloat(pay.amount));
    const outstanding = parseFloat(fr.final_amount) - newPaid;
    let newStatus = newPaid <= 0 ? 'unpaid' : 'partially_paid';
    if (fr.due_date && new Date(fr.due_date) < new Date() && outstanding > 0) newStatus = 'overdue';

    await conn.query('UPDATE fee_records SET amount_paid = ?, status = ? WHERE id = ?', [newPaid, newStatus, pay.fee_record_id]);
    await conn.commit();
    await activityLogger.log(institute_id, userId, 'REVERSE_PAYMENT', 'payment', id, pay, { reason }, req.ip);
    res.json({ success: true, message: 'Payment reversed successfully' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = { list, create, getReceipt, reverse };
