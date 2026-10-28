const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/programController');

const router = express.Router();
router.use(authenticate);

// Programs
router.get('/programs', ctrl.listPrograms);
router.post('/programs', requireRole('admin'), [body('name').trim().notEmpty()], validate, ctrl.createProgram);
router.put('/programs/:id', requireRole('admin'), [body('name').trim().notEmpty()], validate, ctrl.updateProgram);

// Groups
router.get('/groups', ctrl.listGroups);
router.get('/groups/:id', ctrl.getGroupById);
router.post('/groups', requireRole('admin'), [
  body('name').trim().notEmpty(),
  body('program_id').isInt()
], validate, ctrl.createGroup);
router.put('/groups/:id', requireRole('admin'), ctrl.updateGroup);
router.post('/groups/:id/staff', requireRole('admin'), [body('staff_profile_id').isInt()], validate, ctrl.assignStaff);
router.delete('/groups/:id/staff/:staffId', requireRole('admin'), ctrl.removeStaff);

// Enrollments
router.post('/enrollments', requireRole('admin'), [
  body('member_id').isInt(),
  body('program_id').isInt()
], validate, ctrl.enroll);
router.put('/enrollments/:id', requireRole('admin'), ctrl.updateEnrollment);

module.exports = router;
