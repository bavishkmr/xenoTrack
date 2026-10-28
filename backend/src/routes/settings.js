const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.getSettings);
router.put('/', requireRole('admin'), ctrl.updateSettings);
router.get('/activity-logs', requireRole('admin'), ctrl.getActivityLogs);

module.exports = router;
