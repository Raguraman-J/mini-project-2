const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const ClassAssignment = require('../models/ClassAssignment');

// @desc    Add a new subject
// @route   POST /api/data/subjects
// @access  Admin
const addSubject = async (req, res) => {
    try {
        console.log('Adding Subject with data:', req.body);
        const subject = await Subject.create(req.body);
        res.status(201).json(subject);
    } catch (error) {
        console.error('Error in addSubject Details:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Subject with this code already exists' });
        }
        res.status(400).json({ message: error.message });
    }


};

// @desc    Delete a subject
// @route   DELETE /api/data/subjects/:id
// @access  Admin
const deleteSubject = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        await subject.deleteOne();
        res.json({ message: 'Subject removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all subjects
// @route   GET /api/data/subjects
// @access  Private
const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({}).populate('faculty', 'name specialization');
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a new classroom/lab
// @route   POST /api/data/classrooms
// @access  Admin
const addClassroom = async (req, res) => {
    try {
        const classroom = await Classroom.create(req.body);
        res.status(201).json(classroom);
    } catch (error) {
        console.error('Error in addClassroom:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Room with this name already exists' });
        }
        res.status(400).json({ message: error.message });
    }


};

// @desc    Delete a classroom
// @route   DELETE /api/data/classrooms/:id
// @access  Admin
const deleteClassroom = async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) {
            return res.status(404).json({ message: 'Room not found' });
        }
        await classroom.deleteOne();
        res.json({ message: 'Room removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all classrooms
// @route   GET /api/data/classrooms
// @access  Private
const getClassrooms = async (req, res) => {
    try {
        const classrooms = await Classroom.find({});
        res.json(classrooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a faculty member
// @route   DELETE /api/data/faculty/:id
// @access  Admin
const deleteFaculty = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Faculty not found' });
        }
        if (user.role !== 'teacher') {
            return res.status(400).json({ message: 'User is not a faculty member' });
        }
        await user.deleteOne();
        res.json({ message: 'Faculty removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all faculty members
// @route   GET /api/data/faculty
// @access  Private
const getFaculty = async (req, res) => {
    try {
        const faculty = await User.find({ role: 'teacher' });
        res.json(faculty);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get class assignment (Incharge, Tutors, etc)
// @route   GET /api/data/assignments
// @access  Private
const getClassAssignment = async (req, res) => {
    const { department, semester, section } = req.query;
    try {
        console.log('Fetching Assignment with query:', req.query);
        const assignment = await ClassAssignment.findOne({ department, semester, section })
            .populate('classIncharge', 'name specialization')
            .populate('tutors', 'name specialization')
            .populate('seminarIncharge', 'name specialization')
            .populate('librarian', 'name specialization')
            .populate('assignedRoom', 'name');
        res.json(assignment || {});
    } catch (error) {
        console.error('Error in getClassAssignment:', {
            message: error.message,
            stack: error.stack,
            query: req.query
        });
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update class assignment
// @route   POST /api/data/assignments
// @access  Admin
const updateClassAssignment = async (req, res) => {
    const { department, semester, section } = req.body;
    try {
        console.log('Updating Assignment with body:', req.body);

        // Sanitize IDs: convert empty strings to undefined so Mongoose ignores them
        const sanitizedData = { ...req.body };
        ['classIncharge', 'seminarIncharge', 'librarian', 'assignedRoom'].forEach(field => {
            if (sanitizedData[field] === "") sanitizedData[field] = undefined;
        });

        let assignment = await ClassAssignment.findOne({ department, semester, section });

        if (assignment) {
            assignment = await ClassAssignment.findOneAndUpdate(
                { department, semester, section },
                sanitizedData,
                { new: true }
            );
        } else {
            assignment = await ClassAssignment.create(sanitizedData);
        }

        res.status(201).json(assignment);
    } catch (error) {
        console.error('Error in updateClassAssignment:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addSubject,
    getSubjects,
    addClassroom,
    getClassrooms,
    getFaculty,
    deleteSubject,
    deleteClassroom,
    deleteFaculty,
    getClassAssignment,
    updateClassAssignment,
};
