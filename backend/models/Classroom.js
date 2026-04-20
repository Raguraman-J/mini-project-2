const mongoose = require('mongoose');

const classroomSchema = mongoose.Schema({
    name: {
        type: String, // e.g., "LH-101", "CS-LAB-1"
        required: true,
        unique: true,
    },
    capacity: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['classroom', 'lab'],
        default: 'classroom',
    },
    department: {
        type: String, // Optional, if rooms are dept specific
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Classroom', classroomSchema);
