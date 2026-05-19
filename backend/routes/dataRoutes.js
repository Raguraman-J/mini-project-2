const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    addSubject,
    getSubjects,
    deleteSubject,
    addClassroom,
    getClassrooms,
    deleteClassroom,
    getFaculty,
    deleteFaculty,
    getClassAssignment,
    updateClassAssignment,
} = require('../controllers/dataController');

router.route('/subjects').post(protect, admin, addSubject).get(protect, getSubjects);
router.route('/subjects/:id').delete(protect, admin, deleteSubject);
router.route('/classrooms').post(protect, admin, addClassroom).get(protect, getClassrooms);
router.route('/classrooms/:id').delete(protect, admin, deleteClassroom);
router.route('/faculty').get(protect, getFaculty);
router.route('/faculty/:id').delete(protect, admin, deleteFaculty);
router.route('/assignments').get(protect, getClassAssignment).post(protect, admin, updateClassAssignment);

module.exports = router;
