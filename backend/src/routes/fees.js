const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const feeCtrl = require('../controllers/feeController');
const payCtrl = require('../controllers/paymentController');

const router = express.Router();
router.use(authenticate);

// Fee Plans
router.get('/plans', feeCtrl.listFeePlans);
router.post('/plans', requireRole('admin'), [body('name').trim().notEmpty(), body('amount').isFloat({ min: 0 })], validate, feeCtrl.createFeePlan);
router.put('/plans/:id', requireRole('admin'), feeCtrl.updateFeePlan);

// Fee Records
router.get('/records', feeCtrl.listFeeRecords);
router.post('/records', requireRole('admin'), [
  body('member_id').isInt(),
  body('original_amount').isFloat({ min: 0 })
], validate, feeCtrl.createFeeRecord);
router.put('/records/:id', requireRole('admin'), feeCtrl.updateFeeRecord);

// Payments
router.get('/payments', payCtrl.list);
router.post('/payments', [
  body('fee_record_id').isInt(),
  body('amount').isFloat({ min: 0.01 })
], validate, payCtrl.create);
router.get('/payments/:id/receipt', payCtrl.getReceipt);
router.post('/payments/:id/reverse', requireRole('admin'), payCtrl.reverse);

module.exports = router;
