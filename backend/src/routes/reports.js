const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/attendance', ctrl.getAttendanceReport);
router.get('/collections', ctrl.getCollectionReport);
router.get('/outstanding-fees', ctrl.getOutstandingReport);

module.exports = router;
