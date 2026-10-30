const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.getSettings);
router.put('/', requireRole('admin'), ctrl.updateSettings);
router.get('/activity-logs', requireRole('admin'), ctrl.getActivityLogs);

// Gender Options (Accessible to all authenticated users for dropdowns, managed by admin)
router.get('/gender-options', ctrl.getGenderOptions);
router.post('/gender-options', requireRole('admin'), ctrl.createGenderOption);
router.put('/gender-options/reorder', requireRole('admin'), ctrl.reorderGenderOptions);
router.put('/gender-options/:id', requireRole('admin'), ctrl.updateGenderOption);
router.patch('/gender-options/:id/status', requireRole('admin'), ctrl.toggleGenderOptionStatus);
router.delete('/gender-options/:id', requireRole('admin'), ctrl.deleteGenderOption);

module.exports = router;
