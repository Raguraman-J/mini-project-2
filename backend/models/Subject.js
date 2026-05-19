const mongoose = require('mongoose');

const subjectSchema = mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    contentType: {
        type: String,
        enum: ['Theory', 'Practical', 'General'],
        required: true,
        default: 'Theory',
    },
    hoursPerWeek: {
        type: Number,
        required: true,
        default: 4,
    },
    department: {
        type: String,
        required: true,
    },
    semester: {
        type: Number,
        min: 1,
        max: 8,
    },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    // Legacy fields for backward compatibility
    credits: {
        type: Number,
        default: 3,
    },
    lectureHours: {
        type: Number,
        default: 3,
    },
    labHours: {
        type: Number,
        default: 0,
    },
    isLab: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Subject', subjectSchema);
