const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

const router = express.Router();
router.use(authenticate);

router.get('/admin', requireRole('admin'), ctrl.getAdminDashboard);
router.get('/staff', ctrl.getStaffDashboard);

module.exports = router;
