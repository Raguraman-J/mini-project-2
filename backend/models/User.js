const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student',
    },
    department: {
        type: String, // e.g., 'CSE', 'ECE'
    },
    // Student-specific fields
    semester: {
        type: Number, // 1-8 (year of study)
        min: 1,
        max: 8,
    },
    section: {
        type: String, // e.g., 'A', 'B', 'C'
    },
    registerNumber: {
        type: String, // Student registration/roll number
    },
    // Teacher-specific fields
    teacherRoles: [{
        type: String,
        enum: ['subject_teacher', 'class_incharge', 'tutor', 'librarian', 'seminar_incharge'],
    }],
    specialization: {
        type: String, // e.g., "AP,CSE" or "AP,S&H"
    },
    assignedClass: {
        semester: Number,
        section: String,
    },
    phoneNumber: {
        type: String,
    },
}, {
    timestamps: true,
});



module.exports = mongoose.model('User', userSchema);
