const mongoose = require('mongoose');

const classAssignmentSchema = mongoose.Schema({
    department: {
        type: String,
        required: true,
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8,
    },
    section: {
        type: String,
        required: true,
    },
    classIncharge: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    tutors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    seminarIncharge: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    librarian: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    assignedRoom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
    },
}, {
    timestamps: true,
});

// Ensure unique combination of dept/sem/section
classAssignmentSchema.index({ department: 1, semester: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('ClassAssignment', classAssignmentSchema);
