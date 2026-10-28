const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: 'Too many login attempts, please try again later' } });

router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 6 })
], validate, ctrl.login);

router.post('/refresh', [body('refreshToken').notEmpty()], validate, ctrl.refreshToken);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with one uppercase and one number')
], validate, ctrl.changePassword);

module.exports = router;
