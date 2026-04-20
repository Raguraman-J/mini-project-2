const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const ClassAssignment = require('../models/ClassAssignment');
const Notification = require('../models/Notification');
const { sendNotificationEmail } = require('../services/mailService');

// Helper for ordinal numbers
function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"],
        v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Helper for year strings
function getYearString(semester) {
    const sem = parseInt(semester, 10);
    if (sem === 1 || sem === 2) return '1st year';
    if (sem === 3 || sem === 4) return '2nd year';
    if (sem === 5 || sem === 6) return '3rd year';
    if (sem === 7 || sem === 8) return '4th year';
    return `${sem}th sem`;
}
const nodemailer = require('nodemailer');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIODS = 7;

// Helper to check availability
const isAvailable = (resource, day, period, type, takenMap) => {
    // takenMap structure: { resourceId: { day: { period: true } } }
    if (!takenMap[resource]) return true;
    if (!takenMap[resource][day]) return true;
    return !takenMap[resource][day][period];
};

const markTaken = (resource, day, period, takenMap) => {
    if (!takenMap[resource]) takenMap[resource] = {};
    if (!takenMap[resource][day]) takenMap[resource][day] = {};
    takenMap[resource][day][period] = true;
};

// Helper to check for consecutive violations (more than 2 periods in a row)
const hasConsecutiveViolation = (facultyId, day, period, takenMap) => {
    if (!facultyId || !takenMap[facultyId] || !takenMap[facultyId][day]) return false;
    const slots = takenMap[facultyId][day];

    // Check if adding 'period' creates a block of 3
    if (slots[period - 1] && slots[period - 2]) return true; // [p-2, p-1, p]
    if (slots[period - 1] && slots[period + 1]) return true; // [p-1, p, p+1]
    if (slots[period + 1] && slots[period + 2]) return true; // [p, p+1, p+2]

    return false;
};

// Core generation logic extracted for reuse
const generateScheduleLogic = async (department, semester, section, roomId, baseFacultyTaken = {}, baseRoomTaken = {}) => {
    // 1. Fetch relevant subjects for this class
    const subjects = await Subject.find({ department, semester }).populate('faculty');

    if (!subjects || subjects.length === 0) {
        throw new Error(`No subjects found for ${department} Sem ${semester}. Please add subjects first.`);
    }

    // 1b. Handle Room Assignment if roomId provided
    let assignment = await ClassAssignment.findOne({ department, semester, section });
    if (roomId) {
        if (!assignment) {
            assignment = await ClassAssignment.create({ department, semester, section, assignedRoom: roomId });
        } else {
            assignment.assignedRoom = roomId;
            await assignment.save();
        }
    }
    const homeRoomId = roomId || (assignment?.assignedRoom?._id || assignment?.assignedRoom)?.toString();

    // 3. Build subject pools
    const buildSubjectPools = () => {
        let practicals = [];
        let others = [];
        subjects.forEach(sub => {
            const nameUpper = (sub.name || '').toUpperCase();
            const codeUpper = (sub.code || '').toUpperCase();
            const isSingleHour = nameUpper.includes('TWM') || codeUpper.includes('TWM') ||
                nameUpper.includes('TUTOR') || nameUpper.includes('WARD') || nameUpper.includes('MENTOR') ||
                nameUpper.includes('LIBRARY') || codeUpper.includes('LIB') ||
                nameUpper.includes('SEMINAR') || codeUpper.includes('SEM');

            const hours = isSingleHour ? 1 : sub.hoursPerWeek;
            const list = (sub.contentType === 'Practical') ? practicals : others;
            for (let i = 0; i < hours; i++) {
                list.push(sub);
            }
        });
        practicals.sort((a, b) => a.code.localeCompare(b.code));
        others.sort(() => Math.random() - 0.5);
        return { practicals, others };
    };

    const allRooms = await Classroom.find({});
    const labRooms = allRooms.filter(r => r.type === 'lab');
    const theoryRooms = allRooms.filter(r => r.type === 'classroom');

    const requiredHoursMap = {};
    subjects.forEach(sub => {
        const nameUpper = (sub.name || '').toUpperCase();
        const codeUpper = (sub.code || '').toUpperCase();
        const isSingleHour = nameUpper.includes('TWM') || codeUpper.includes('TWM') ||
            nameUpper.includes('TUTOR') || nameUpper.includes('WARD') || nameUpper.includes('MENTOR') ||
            nameUpper.includes('LIBRARY') || codeUpper.includes('LIB') ||
            nameUpper.includes('SEMINAR') || codeUpper.includes('SEM');
        requiredHoursMap[sub._id.toString()] = {
            code: sub.code,
            name: sub.name,
            requiredHours: isSingleHour ? 1 : sub.hoursPerWeek,
            contentType: sub.contentType
        };
    });

    const deepCopyTaken = (src) => {
        const copy = {};
        for (const key in src) {
            copy[key] = {};
            for (const day in src[key]) {
                copy[key][day] = { ...src[key][day] };
            }
        }
        return copy;
    };

    const MAX_ATTEMPTS = 3;
    let bestSchedule = null;
    let bestRemaining = Infinity;
    let finalFacultyTaken = null;
    let finalRoomTaken = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const relaxConsecutive = (attempt === MAX_ATTEMPTS - 1);
        const facultyTaken = deepCopyTaken(baseFacultyTaken);
        const roomTaken = deepCopyTaken(baseRoomTaken);

        const { practicals, others } = buildSubjectPools();
        let practicalSubjects = [...practicals];
        let otherSubjects = [...others];

        let fullSchedule = [];
        for (const day of DAYS) {
            fullSchedule.push({ day, slots: Array(PERIODS + 1).fill(null) });
        }

        // Pass 1: Practicals
        for (let pass = 0; pass < 3; pass++) {
            for (const dayObj of fullSchedule) {
                const day = dayObj.day;
                const dailySlots = dayObj.slots;
                let dayPracticals = dailySlots.filter(s => s?.type === 'Practical').length / 2;

                while (practicalSubjects.length >= 2 && dayPracticals < 2) {
                    let foundGap = false;
                    for (let p = 1; p < PERIODS; p++) {
                        if (dailySlots[p] === null && dailySlots[p + 1] === null) {
                            for (let i = 0; i < practicalSubjects.length; i += 2) {
                                const sub = practicalSubjects[i];
                                const facultyId = sub.faculty ? sub.faculty._id.toString() : null;
                                const facultyFree = !facultyId || (isAvailable(facultyId, day, p, 'faculty', facultyTaken) && isAvailable(facultyId, day, p + 1, 'faculty', facultyTaken));

                                let isSafeConsecutive = true;
                                if (!relaxConsecutive && facultyId) {
                                    isSafeConsecutive = (!facultyTaken[facultyId]?.[day]?.[p - 1] && !facultyTaken[facultyId]?.[day]?.[p + 2]);
                                }

                                if (facultyFree && isSafeConsecutive) {
                                    const room = labRooms.find(r => isAvailable(r._id.toString(), day, p, 'room', roomTaken) && isAvailable(r._id.toString(), day, p + 1, 'room', roomTaken));
                                    if (room) {
                                        const slotData = { subject: sub._id, faculty: sub.faculty ? sub.faculty._id : null, room: room._id, type: 'Practical' };
                                        dailySlots[p] = { ...slotData, period: p };
                                        dailySlots[p + 1] = { ...slotData, period: p + 1 };
                                        markTaken(facultyId, day, p, facultyTaken);
                                        markTaken(facultyId, day, p + 1, facultyTaken);
                                        markTaken(room._id.toString(), day, p, roomTaken);
                                        markTaken(room._id.toString(), day, p + 1, roomTaken);
                                        practicalSubjects.splice(i, 2);
                                        dayPracticals++;
                                        foundGap = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (foundGap) break;
                    }
                    if (!foundGap) break;
                }
            }
        }

        // Pass 2: Others
        const remainingToSchedule = [...otherSubjects, ...practicalSubjects];
        remainingToSchedule.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);
        for (let pass = 0; pass < 2; pass++) {
            for (const dayObj of fullSchedule) {
                const day = dayObj.day;
                const dailySlots = dayObj.slots;
                for (let p = 1; p <= PERIODS; p++) {
                    if (dailySlots[p] !== null) continue;
                    if (remainingToSchedule.length > 0) {
                        let scheduled = false;
                        for (let i = 0; i < remainingToSchedule.length; i++) {
                            const sub = remainingToSchedule[i];
                            const facultyId = sub.faculty ? sub.faculty._id.toString() : null;
                            if (!facultyId || isAvailable(facultyId, day, p, 'faculty', facultyTaken)) {
                                if (!relaxConsecutive && facultyId && hasConsecutiveViolation(facultyId, day, p, facultyTaken)) continue;

                                let room = null;
                                if (homeRoomId && isAvailable(homeRoomId, day, p, 'room', roomTaken)) {
                                    room = theoryRooms.find(r => r._id.toString() === homeRoomId) || allRooms.find(r => r._id.toString() === homeRoomId);
                                }
                                if (!room) {
                                    room = (sub.contentType === 'Practical' ? labRooms : theoryRooms).find(r => isAvailable(r._id.toString(), day, p, 'room', roomTaken));
                                }
                                if (!room && !theoryRooms.length) room = allRooms.find(r => isAvailable(r._id.toString(), day, p, 'room', roomTaken));

                                if (room) {
                                    dailySlots[p] = { period: p, subject: sub._id, faculty: sub.faculty ? sub.faculty._id : null, room: room._id, type: sub.contentType || 'Theory' };
                                    markTaken(facultyId, day, p, facultyTaken);
                                    markTaken(room._id.toString(), day, p, roomTaken);
                                    remainingToSchedule.splice(i, 1);
                                    scheduled = true;
                                    break;
                                }
                            }
                        }
                        if (!scheduled && pass === 1) dailySlots[p] = { period: p, type: 'Free' };
                    } else {
                        dailySlots[p] = { period: p, type: 'Free' };
                    }
                }
            }
        }

        // Pass 3: Force Fill
        if (remainingToSchedule.length > 0) {
            for (const dayObj of fullSchedule) {
                const day = dayObj.day;
                const dailySlots = dayObj.slots;
                for (let p = 1; p <= PERIODS; p++) {
                    if (remainingToSchedule.length === 0) break;
                    if (dailySlots[p] !== null && dailySlots[p].type !== 'Free') continue;
                    for (let i = 0; i < remainingToSchedule.length; i++) {
                        const sub = remainingToSchedule[i];
                        const facultyId = sub.faculty ? sub.faculty._id.toString() : null;
                        if (facultyId && !isAvailable(facultyId, day, p, 'faculty', facultyTaken)) continue;
                        let room = allRooms.find(r => isAvailable(r._id.toString(), day, p, 'room', roomTaken));
                        if (room) {
                            dailySlots[p] = { period: p, subject: sub._id, faculty: sub.faculty ? sub.faculty._id : null, room: room._id, type: sub.contentType || 'Theory' };
                            markTaken(facultyId, day, p, facultyTaken);
                            markTaken(room._id.toString(), day, p, roomTaken);
                            remainingToSchedule.splice(i, 1);
                            break;
                        }
                    }
                }
            }
        }

        if (remainingToSchedule.length < bestRemaining) {
            bestRemaining = remainingToSchedule.length;
            bestSchedule = fullSchedule;
            finalFacultyTaken = facultyTaken;
            finalRoomTaken = roomTaken;
        }
        if (remainingToSchedule.length === 0) break;
    }

    // Cleanup and Summary
    const finalSchedule = bestSchedule.map(dayObj => ({
        day: dayObj.day,
        slots: dayObj.slots.map((s, idx) => s || { period: idx, type: 'Free' }).filter(s => s.period > 0)
    }));

    const scheduledHoursMap = {};
    finalSchedule.forEach(day => day.slots.forEach(slot => { if (slot.subject) scheduledHoursMap[slot.subject] = (scheduledHoursMap[slot.subject] || 0) + 1; }));

    const warnings = [];
    for (const subId in requiredHoursMap) {
        if ((scheduledHoursMap[subId] || 0) < requiredHoursMap[subId].requiredHours) {
            warnings.push(`${requiredHoursMap[subId].code}: ${scheduledHoursMap[subId]}/${requiredHoursMap[subId].requiredHours}`);
        }
    }

    return { schedule: finalSchedule, warnings, facultyTaken: finalFacultyTaken, roomTaken: finalRoomTaken };
};

// @desc    Generate Timetable
// @route   POST /api/scheduler/generate
// @access  Admin
const generateTimetable = async (req, res) => {

    const { department, semester, section, roomId } = req.body;

    if (!department || !semester || !section) {
        return res.status(400).json({ message: 'Please provide department, semester, and section' });
    }

    try {
        // Clear existing for this specific class
        await Timetable.deleteMany({ department, semester, section });

        // Build initial maps from other classes
        const existingTimetables = await Timetable.find({});
        const baseFacultyTaken = {};
        const baseRoomTaken = {};
        existingTimetables.forEach(tt => {
            tt.slots.forEach(slot => {
                if (slot.faculty) markTaken(slot.faculty._id || slot.faculty, tt.day, slot.period, baseFacultyTaken);
                if (slot.room) markTaken(slot.room._id || slot.room, tt.day, slot.period, baseRoomTaken);
            });
        });

        const { schedule, warnings } = await generateScheduleLogic(department, semester, section, roomId, baseFacultyTaken, baseRoomTaken);

        for (const daySchedule of schedule) {
            await Timetable.create({
                department, semester, section,
                day: daySchedule.day,
                slots: daySchedule.slots
            });
        }

        const populatedTT = await Timetable.find({ department, semester, section })
            .populate('slots.subject').populate('slots.faculty').populate('slots.room').sort({ day: 1 });

        res.status(201).json({ timetable: populatedTT, warnings });
    } catch (error) {
        console.error('Generation Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate Department-wide Timetable
// @route   POST /api/scheduler/generate-department
// @access  Admin
const generateDepartmentTimetable = async (req, res) => {
    const { department, semester } = req.body;

    if (!department || !semester) {
        return res.status(400).json({ message: 'Please provide department and semester' });
    }

    try {
        // 1. Identify all sections for this department/semester
        const assignments = await ClassAssignment.find({ department, semester });
        if (!assignments || assignments.length === 0) {
            return res.status(400).json({ message: `No sections found in Class Assignments for ${department} Sem ${semester}.` });
        }

        const sections = assignments.map(a => a.section).sort();

        // 2. Clear existing timetables for this dept/sem
        await Timetable.deleteMany({ department, semester });

        // 3. Build initial global conflict maps (from OTHER departments)
        const otherTimetables = await Timetable.find({ $or: [{ department: { $ne: department } }, { semester: { $ne: semester } }] });
        let facultyTaken = {};
        let roomTaken = {};
        otherTimetables.forEach(tt => {
            tt.slots.forEach(slot => {
                if (slot.faculty) markTaken(slot.faculty._id || slot.faculty, tt.day, slot.period, facultyTaken);
                if (slot.room) markTaken(slot.room._id || slot.room, tt.day, slot.period, roomTaken);
            });
        });

        const results = [];
        const allWarnings = [];

        // 4. Sequentially generate for each section
        for (const section of sections) {
            const assignment = assignments.find(a => a.section === section);
            const roomId = assignment?.assignedRoom?.toString();

            const { schedule, warnings, facultyTaken: updatedFaculty, roomTaken: updatedRoom } =
                await generateScheduleLogic(department, semester, section, roomId, facultyTaken, roomTaken);

            // Save this section
            for (const daySchedule of schedule) {
                await Timetable.create({
                    department, semester, section,
                    day: daySchedule.day,
                    slots: daySchedule.slots
                });
            }

            // Update maps for the NEXT section
            facultyTaken = updatedFaculty;
            roomTaken = updatedRoom;

            results.push({ section, warnings });
            if (warnings.length > 0) allWarnings.push(`Section ${section}: ${warnings.join(', ')}`);
        }

        const finalTimetables = await Timetable.find({ department, semester })
            .populate('slots.subject').populate('slots.faculty').populate('slots.room')
            .sort({ section: 1, day: 1 });

        res.status(201).json({
            message: `Generated timetables for ${sections.length} sections: ${sections.join(', ')}`,
            timetables: finalTimetables,
            warnings: allWarnings
        });

    } catch (error) {
        console.error('Dept Generation Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Timetable
// @route   GET /api/scheduler
// @access  Public (or protected)
const getTimetables = async (req, res) => {
    const { department, semester, section } = req.query;
    try {
        const query = {};
        if (department) query.department = department;
        if (semester) query.semester = semester;
        if (section) query.section = section;

        const timetables = await Timetable.find(query)
            .populate('slots.subject')
            .populate('slots.faculty')
            .populate('slots.room');

        res.json(timetables);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Get Faculty Schedule
// @route   GET /api/scheduler/faculty/:facultyId
// @access  Protected
// @desc    Get Faculty Schedule
// @route   GET /api/scheduler/faculty/:facultyId
// @access  Protected
const getFacultySchedule = async (req, res) => {
    const { facultyId } = req.params;

    try {
        // Find all timetables that have this faculty in any slot
        // This returns multiple docs per day if faculty teaches multiple sections
        const timetables = await Timetable.find({ 'slots.faculty': facultyId })
            .populate('slots.subject')
            .populate('slots.faculty')
            .populate('slots.room')
            .sort({ day: 1 });

        const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const PERIODS = 7;

        // Initialize consolidated schedule
        // Map: Day -> Array of Slots (size 8, 1-based index)
        const consolidated = {};
        DAYS.forEach(d => {
            consolidated[d] = new Array(PERIODS + 1).fill(null);
        });

        // Merge logic
        timetables.forEach(tt => {
            const day = tt.day;
            if (consolidated[day]) {
                tt.slots.forEach(slot => {
                    if (slot && slot.faculty && slot.faculty._id.toString() === facultyId) {
                        // Found a slot for this faculty
                        // Inject class info into the slot object for the frontend
                        const enrichedSlot = {
                            ...slot.toObject(),
                            department: tt.department,
                            semester: tt.semester,
                            section: tt.section
                        };

                        // Place in period
                        // Warning: potential overwrites if conflict exists (shouldn't happen with valid scheduler)
                        consolidated[day][slot.period] = enrichedSlot;
                    }
                });
            }
        });

        // Convert to array format expected by frontend
        const facultyScheduleResult = DAYS.map(day => ({
            day,
            slots: consolidated[day].filter(s => s !== null) // Filter out nulls
        }));

        res.json(facultyScheduleResult);
    } catch (error) {
        console.error('Faculty Schedule Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Available Classes for a specific slot
// @route   GET /api/scheduler/available
// @access  Protected
const getAvailableClasses = async (req, res) => {
    const { day, period } = req.query; // e.g., Mon, 1

    if (!day || !period) {
        return res.status(400).json({ message: 'Day and Period are required' });
    }

    try {
        const pIndex = Number(period);
        // Find all timetables for that day
        const timetables = await Timetable.find({ day });

        // Filter for those where the specific period slot is 'Free' or null
        const availableClasses = timetables.filter(tt => {
            const slot = tt.slots[pIndex];
            // Check if slot is explicitly 'Free' or null/undefined
            // Also ensure it's not just missing (less than length)
            return !slot || slot.type === 'Free' || !slot.subject;
        }).map(tt => ({
            department: tt.department,
            semester: tt.semester,
            section: tt.section
        }));

        res.json(availableClasses);
    } catch (error) {
        console.error('Available Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch available classes' });
    }
};

// @desc    Email Faculty Schedule
// @route   POST /api/scheduler/email-faculty
// @access  Protected
const emailFacultySchedule = async (req, res) => {
    const { facultyId, scheduleData } = req.body;

    console.log(`--- Email Schedule Triggered for Faculty ID: ${facultyId} ---`);

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    try {
        const faculty = await User.findById(facultyId);
        if (!faculty) {
            console.error(`Faculty not found for ID: ${facultyId}`);
            return res.status(404).json({ message: 'Faculty user not found in database.' });
        }

        if (!faculty.email) {
            console.error(`Faculty ${faculty.name} has no email address.`);
            return res.status(400).json({ message: `Faculty ${faculty.name} does not have a registered email address. Please update their profile.` });
        }

        console.log(`Configuring transporter for: ${emailUser}`);
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        // Simplified HTML table for the email
        htmlSchedule = `<div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
            <h2 style="color: #2c3e50;">Weekly Schedule: ${faculty.name}</h2>
            <p>Hello ${faculty.name}, here is your weekly timetable update.</p>`;

        scheduleData.forEach(day => {
            htmlSchedule += `<h3 style="background: #f8f9fa; padding: 5px;">${day.day}</h3><ul style="list-style: none; padding-left: 0;">`;
            if (day.slots && day.slots.length > 0) {
                day.slots.forEach(slot => {
                    const subName = slot.subject?.name || 'Subject';
                    const subCode = slot.subject?.code || '';
                    const room = slot.room?.name || 'TBD';
                    htmlSchedule += `<li style="margin-bottom: 8px;">
                        <strong>Period ${slot.period}:</strong> ${subName} (${subCode}) 
                        <br/><span style="color: #666; font-size: 0.9rem;">Class: ${slot.department} Sem ${slot.semester} ${slot.section} | Room: ${room}</span>
                    </li>`;
                });
            } else {
                htmlSchedule += `<li>No classes scheduled</li>`;
            }
            htmlSchedule += `</ul>`;
        });
        htmlSchedule += `<p style="margin-top: 20px; font-size: 0.8rem; color: #999;">Automated message from Class Timetable System</p></div>`;

        const mailOptions = {
            from: emailUser,
            to: faculty.email,
            subject: `Timetable: ${faculty.name}`,
            html: htmlSchedule
        };

        console.log(`Attempting to send mail to ${faculty.email}...`);
        await transporter.sendMail(mailOptions);
        console.log(`Email successfully sent to ${faculty.email}`);
        res.json({ message: 'Email sent successfully to ' + faculty.email });

    } catch (error) {
        console.error('CRITICAL Email Error:', error);

        if (error.code === 'EAUTH') {
            return res.status(500).json({
                message: 'Authentication failed! Please check if your EMAIL_USER is correct and that you are using a GMAIL APP PASSWORD (not your normal password).'
            });
        }

        res.status(500).json({ message: `Mail Error: ${error.message}` });
    }
};

// @desc    Send Next Period Alerts to Faculty
// @route   POST /api/scheduler/send-alerts
// @access  Protected/Admin
// @desc    Send Next Period Alerts to Faculty
// @route   POST /api/scheduler/send-alerts
// @access  Protected/Admin
const sendPeriodAlerts = async (req, res) => {
    try {
        const now = new Date();
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentDay = daysShort[now.getDay()];

        if (currentDay === 'Sun') {
            return res.status(200).json({ message: 'No classes today (Sunday)' });
        }

        const periodSlots = [
            { period: 1, start: '09:00' },
            { period: 2, start: '10:00' },
            { period: 3, start: '11:15' },
            { period: 4, start: '12:15' },
            { period: 5, start: '14:10' },
            { period: 6, start: '15:00' },
            { period: 7, start: '16:00' },
        ];

        const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        let targetPeriod = req.body.forcePeriod;
        if (!targetPeriod) {
            const next = periodSlots.find(p => p.start > currentTimeStr);
            if (next) targetPeriod = next.period;
        }

        if (!targetPeriod) {
            return res.status(200).json({ message: 'No more classes scheduled for today' });
        }

        const timetables = await Timetable.find({ day: currentDay })
            .populate('slots.subject')
            .populate('slots.faculty')
            .populate('slots.room');

        const dayStr = String(now.getDate()).padStart(2, '0');
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const dateStr = `${dayStr}/${monthStr}/${now.getFullYear()}`;

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const timeStr = `${String(hours).padStart(2, '0')}.${minutes}${ampm}`;

        let alertCount = 0;
        const alertLog = [];

        for (const tt of timetables) {
            const slot = tt.slots.find(s => s.period === targetPeriod && s.faculty);
            if (slot && slot.faculty) {
                const faculty = slot.faculty;
                const yearStr = getYearString(tt.semester);
                const periodOrdinal = getOrdinal(targetPeriod);
                const roomName = slot.room ? slot.room.name : 'TBD';

                const message = `${dateStr} \n${timeStr}\nyour next period : ${periodOrdinal} period\nyou have the class :  \n${yearStr} ${tt.department.toLowerCase()} ${tt.section.toLowerCase()} \nroom no. ${roomName}`;

                // 1. In-App Notification
                await Notification.create({
                    recipient: faculty._id,
                    message,
                    type: 'class_alert'
                });

                // 2. Email Notification
                if (faculty.email) {
                    await sendNotificationEmail(faculty.email, `Class Alert for ${periodOrdinal} Period`, message);
                    alertLog.push({ faculty: faculty.name, email: faculty.email, status: 'Emailed' });
                    alertCount++;
                } else {
                    alertLog.push({ faculty: faculty.name, status: 'No Email' });
                }
            }
        }

        res.json({
            message: `Alerts processed for Period ${targetPeriod}`,
            count: alertCount,
            details: alertLog
        });

    } catch (error) {
        console.error('Alert Generation Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send Personalized Alert to Specific Faculty
// @route   POST /api/scheduler/send-targeted-alert
// @access  Protected/Admin
const sendTargetedPeriodAlert = async (req, res) => {
    const { facultyId, forcePeriod } = req.body;
    if (!facultyId) return res.status(400).json({ message: 'Faculty ID is required' });

    try {
        const faculty = await User.findById(facultyId);
        if (!faculty) return res.status(404).json({ message: 'Faculty not found' });

        const now = new Date();
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentDay = daysShort[now.getDay()];

        if (currentDay === 'Sun') {
            return res.status(400).json({ message: 'Cannot send alerts on Sunday' });
        }

        const periodSlots = [
            { period: 1, start: '09:00' },
            { period: 2, start: '10:00' },
            { period: 3, start: '11:15' },
            { period: 4, start: '12:15' },
            { period: 5, start: '14:10' },
            { period: 6, start: '15:00' },
            { period: 7, start: '16:00' },
        ];

        const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        let targetPeriod = forcePeriod;
        if (!targetPeriod) {
            const next = periodSlots.find(p => p.start > currentTimeStr);
            if (next) targetPeriod = next.period;
        }

        if (!targetPeriod) {
            return res.status(400).json({ message: 'No more classes scheduled for today' });
        }

        // Find if faculty has a slot in this period
        const timetable = await Timetable.findOne({
            day: currentDay,
            'slots.period': targetPeriod,
            'slots.faculty': facultyId
        })
            .populate('slots.subject')
            .populate('slots.room');

        if (!timetable) {
            return res.status(404).json({ message: `No class found for this faculty in Period ${targetPeriod} today.` });
        }

        const slot = timetable.slots.find(s => s.period === targetPeriod && String(s.faculty) === String(facultyId));
        if (!slot) return res.status(404).json({ message: 'Class slot not found' });

        const dayStr = String(now.getDate()).padStart(2, '0');
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const dateStr = `${dayStr}/${monthStr}/${now.getFullYear()}`;

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const timeStr = `${String(hours).padStart(2, '0')}.${minutes}${ampm}`;

        const yearStr = getYearString(timetable.semester);
        const periodOrdinal = getOrdinal(targetPeriod);
        const roomName = slot.room ? slot.room.name : 'TBD';

        const message = `${dateStr} \n${timeStr}\nyour next period : ${periodOrdinal} period\nyou have the class :  \n${yearStr} ${timetable.department.toLowerCase()} ${timetable.section.toLowerCase()} \nroom no. ${roomName}`;

        // Send Email
        if (faculty.email) {
            await sendNotificationEmail(faculty.email, `Class Alert for ${periodOrdinal} Period`, message);
        }

        // In-App
        await Notification.create({
            recipient: faculty._id,
            message,
            type: 'class_alert'
        });

        res.json({ message: `Alert sent successfully for Period ${targetPeriod}`, targetPeriod });

    } catch (error) {
        console.error('Targeted Alert Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    generateScheduleLogic,
    generateTimetable,
    generateDepartmentTimetable,
    getTimetables,
    getFacultySchedule,
    getAvailableClasses,
    emailFacultySchedule,
    sendPeriodAlerts,
    sendTargetedPeriodAlert
};

