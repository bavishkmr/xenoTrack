const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/staffController');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', [
  body('full_name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
], validate, ctrl.create);
router.put('/:id', [body('full_name').trim().notEmpty()], validate, ctrl.update);
router.post('/:id/reset-password', [body('new_password').isLength({ min: 8 })], validate, ctrl.resetPassword);

module.exports = router;
