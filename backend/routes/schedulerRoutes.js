const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    generateTimetable,
    generateDepartmentTimetable,
    getTimetables,
    getFacultySchedule,
    getAvailableClasses,
    emailFacultySchedule,
    sendPeriodAlerts,
    sendTargetedPeriodAlert
} = require('../controllers/schedulerController');

router.post('/generate', protect, admin, generateTimetable);
router.post('/generate-department', protect, admin, generateDepartmentTimetable);
router.post('/email-faculty', protect, emailFacultySchedule);
router.get('/', getTimetables);
router.get('/faculty/:facultyId', protect, getFacultySchedule);
router.get('/available', protect, admin, getAvailableClasses);
router.post('/send-alerts', protect, admin, sendPeriodAlerts);
router.post('/send-targeted-alert', protect, admin, sendTargetedPeriodAlert);

module.exports = router;
