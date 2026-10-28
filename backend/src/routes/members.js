const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/memberController');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('admin'), [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone(),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('dob').optional({ checkFalsy: true }).isDate(),
], validate, ctrl.create);
router.put('/:id', requireRole('admin'), [
  body('full_name').trim().notEmpty(),
], validate, ctrl.update);
router.patch('/:id/status', requireRole('admin'), [
  body('status').isIn(['active','inactive','suspended','completed'])
], validate, ctrl.updateStatus);

module.exports = router;
