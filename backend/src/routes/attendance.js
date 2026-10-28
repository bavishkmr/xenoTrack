const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/attendanceController');

const router = express.Router();
router.use(authenticate);

router.get('/sessions', ctrl.listSessions);
router.post('/sessions', [
  body('group_id').isInt(),
  body('session_date').isDate()
], validate, ctrl.createSession);
router.get('/sessions/:session_id/records', ctrl.getSessionRecords);
router.post('/records/bulk', [
  body('session_id').isInt(),
  body('records').isArray()
], validate, ctrl.saveBulkAttendance);
router.put('/records/:id', [
  body('status').isIn(['present','absent','late','excused'])
], validate, ctrl.updateRecord);

module.exports = router;
