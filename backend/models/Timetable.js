const mongoose = require('mongoose');

const timetableSchema = mongoose.Schema({
    department: {
        type: String,
        required: true,
    },
    semester: {
        type: Number,
        required: true,
    },
    section: {
        type: String, // e.g., 'A', 'B'
        required: true,
    },
    day: {
        type: String, // Mon, Tue, Wed, ...
        required: true,
    },
    slots: [
        {
            period: {
                type: Number, // 1 to 7
                required: true,
            },
            startTime: String,
            endTime: String,
            subject: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Subject',
            },
            faculty: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            room: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Classroom',
            },
            type: {
                type: String,
                enum: ['Theory', 'Practical', 'General', 'Break', 'Lunch', 'Free'],
                default: 'Theory',
            },
        }
    ]
}, {
    timestamps: true,
});

// Compound index to ensure unique schedule per section/day?
// Actually we want to query by dept/sem/section easily.
timetableSchema.index({ department: 1, semester: 1, section: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
