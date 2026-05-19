const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role, department, semester, section, registerNumber, teacherRoles, specialization, phoneNumber } = req.body;

    if (!name || !email || !password) {
        res.status(400).json({ message: 'Please add all fields' });
        return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || 'student',
        department,
        semester,
        section,
        registerNumber,
        teacherRoles,
        specialization,
        assignedClass: req.body.assignedClass,
        phoneNumber,
    });

    if (user) {
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            semester: user.semester,
            section: user.section,
            registerNumber: user.registerNumber,
            teacherRoles: user.teacherRoles,
            specialization: user.specialization,
            assignedClass: user.assignedClass,
            phoneNumber: user.phoneNumber,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    console.log('DEBUG: authController.js loginUser called from:', __filename);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for user email
    const user = await User.findOne({ email: normalizedEmail });

    if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            semester: user.semester,
            section: user.section,
            registerNumber: user.registerNumber,
            teacherRoles: user.teacherRoles,
            specialization: user.specialization,
            assignedClass: user.assignedClass,
            phoneNumber: user.phoneNumber,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'DEBUG_LOGIN_FAIL' });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.status(200).json(req.user);
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.department = req.body.department || user.department;
        user.phoneNumber = req.body.phoneNumber || user.phoneNumber;

        // Update student-specific fields
        if (user.role === 'student') {
            if (req.body.semester) user.semester = req.body.semester;
            if (req.body.section) user.section = req.body.section;
            if (req.body.registerNumber) user.registerNumber = req.body.registerNumber;
        }

        // Update teacher-specific fields
        if (user.role === 'teacher') {
            if (req.body.teacherRoles) user.teacherRoles = req.body.teacherRoles;
            if (req.body.specialization) user.specialization = req.body.specialization;
            if (req.body.assignedClass) user.assignedClass = req.body.assignedClass;
        }

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            department: updatedUser.department,
            semester: updatedUser.semester,
            section: updatedUser.section,
            registerNumber: updatedUser.registerNumber,
            teacherRoles: updatedUser.teacherRoles,
            specialization: updatedUser.specialization,
            assignedClass: updatedUser.assignedClass,
            phoneNumber: updatedUser.phoneNumber,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};


module.exports = {

    registerUser,
    loginUser,
    getMe,
    updateUserProfile,
};

