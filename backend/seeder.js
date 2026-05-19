const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        await User.deleteMany();
        await Subject.deleteMany();
        await Classroom.deleteMany();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123', salt);

        const users = [
            {
                name: 'Admin User',
                email: 'admin@hit.edu.in',
                password: hashedPassword,
                role: 'admin',
                department: 'ADMIN',
            },
            {
                name: 'John Professor',
                email: 'faculty@college.edu',
                password: hashedPassword,
                role: 'teacher',
                department: 'CSE',
            },
            {
                name: 'Jane Student',
                email: 'student@college.edu',
                password: hashedPassword,
                role: 'student',
                department: 'CSE',
            },
        ];

        await User.insertMany(users);

        // Add some dummy subjects
        const subjects = [
            { name: 'Mathematics', code: 'MA101', department: 'CSE', credits: 4, lectureHours: 3, labHours: 0 },
            { name: 'Operating Systems', code: 'CS301', department: 'CSE', credits: 3, lectureHours: 3, labHours: 0 },
            { name: 'Database Management', code: 'CS302', department: 'CSE', credits: 3, lectureHours: 3, labHours: 0 },
            { name: 'Computer Networks', code: 'CS303', department: 'CSE', credits: 3, lectureHours: 3, labHours: 0 },
            { name: 'Artificial Intelligence', code: 'CS304', department: 'CSE', credits: 3, lectureHours: 3, labHours: 0 },
            { name: 'OS Lab', code: 'CS301L', department: 'CSE', credits: 1, lectureHours: 0, labHours: 3, isLab: true },
            { name: 'DBMS Lab', code: 'CS302L', department: 'CSE', credits: 1, lectureHours: 0, labHours: 3, isLab: true },
        ];

        await Subject.insertMany(subjects);

        const rooms = [
            { name: 'LH-101', capacity: 60, type: 'classroom' },
            { name: 'LH-102', capacity: 60, type: 'classroom' },
            { name: 'CS-LAB-1', capacity: 30, type: 'lab' },
        ];

        await Classroom.insertMany(rooms);

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

importData();
