import { useState, useEffect, useContext, useRef } from 'react';
import Navbar from '../components/Navbar';
import TimetableGrid from '../components/TimetableGrid';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';
import html2pdf from 'html2pdf.js';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [view, setView] = useState('generate'); // generate, subjects, rooms, facultyView, faculty, assignments
    const [timetable, setTimetable] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [facultySchedule, setFacultySchedule] = useState([]);
    const [classAssignment, setClassAssignment] = useState({});
    const [filterSem, setFilterSem] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [selectedBulkFaculty, setSelectedBulkFaculty] = useState([]);
    const [forcePeriod, setForcePeriod] = useState('');
    const [isDeptMode, setIsDeptMode] = useState(false);
    const [deptTimetables, setDeptTimetables] = useState([]);
    const [facultySubView, setFacultySubView] = useState('single');

    // Form States
    const [dept, setDept] = useState('CSE');
    const [sem, setSem] = useState(1);
    const [sec, setSec] = useState('A');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const timetableRef = useRef(null);

    const handleDownloadPDF = () => {
        if (!timetable || timetable.length === 0) return;

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayMap = { 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday' };
        const periods = [
            { label: '9.15-10.05', period: 1 },
            { label: '10.05-10.55', period: 2 },
            { label: '11.15-12.05', period: 3, breakBefore: 'BREAK' },
            { label: '12.05-12.55', period: 4 },
            { label: '2.00-2.50', period: 5, breakBefore: 'LUNCH BREAK' },
            { label: '2.50-3.40', period: 6 },
            { label: '3.40-4.30', period: 7 },
        ];

        // Build header columns
        let headerRow1 = '<th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">Day</th>';
        let headerRow2 = '<th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">Hour</th>';

        periods.forEach((p, idx) => {
            if (p.breakBefore) {
                headerRow1 += `<th rowspan="2" style="border:1px solid #000;padding:4px;text-align:center;font-weight:bold;writing-mode:vertical-rl;letter-spacing:2px;background:#f0f0f0;width:25px;">${p.breakBefore}</th>`;
            }
            headerRow1 += `<th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${idx + 1}</th>`;
            headerRow2 += `<th style="border:1px solid #000;padding:6px;text-align:center;font-size:11px;">${p.label}</th>`;
        });

        // Build day rows
        let bodyRows = '';
        //const isFirstDay = { break: true, lunch: true };
        days.forEach((dayFull, dayIdx) => {
            const dayShort = Object.keys(dayMap).find(k => dayMap[k] === dayFull);
            const dayData = timetable.find(t => t.day === dayShort);

            let row = `<td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${dayFull}</td>`;

            periods.forEach((p) => {
                if (p.breakBefore && dayIdx === 0) {
                    row += `<td rowspan="${days.length}" style="border:1px solid #000;padding:4px;text-align:center;font-weight:bold;writing-mode:vertical-rl;letter-spacing:2px;background:#f0f0f0;width:25px;">${p.breakBefore}</td>`;
                }
                const slot = dayData?.slots?.find(s => s.period === p.period);
                let cellContent = '';
                if (slot && slot.subject && slot.type !== 'Free') {
                    cellContent = slot.subject.code || slot.subject.name || '';
                }
                row += `<td style="border:1px solid #000;padding:6px;text-align:center;font-size:12px;">${cellContent}</td>`;
            });

            bodyRows += `<tr>${row}</tr>`;
        });

        // Subject summary rows
        const relevantSubjects = subjects.filter(s =>
            s.department === dept && Number(s.semester) === Number(sem)
        );

        // Calculate scheduled hours
        const scheduledMap = {};
        timetable.forEach(day => {
            day.slots.forEach(slot => {
                if (slot.subject && slot.subject._id) {
                    scheduledMap[slot.subject._id] = (scheduledMap[slot.subject._id] || 0) + 1;
                }
            });
        });

        const theory = relevantSubjects.filter(s => s.contentType === 'Theory');
        const practical = relevantSubjects.filter(s => s.contentType === 'Practical');
        const general = relevantSubjects.filter(s => s.contentType === 'General');

        const buildSubjectRows = (group, label) => {
            return group.map((sub, idx) => {
                const hrs = scheduledMap[sub._id] || 0;
                const facultyName = sub.faculty ? `${sub.faculty.name}${sub.faculty.specialization ? ', ' + sub.faculty.specialization : ''}` : 'N/A';
                return `<tr>
                    ${idx === 0 ? `<td rowspan="${group.length}" style="border:1px solid #000;padding:6px;font-weight:bold;vertical-align:middle;text-align:center;">${label}</td>` : ''}
                    <td style="border:1px solid #000;padding:6px;text-align:center;">${sub.code}</td>
                    <td style="border:1px solid #000;padding:6px;">${sub.name}</td>
                    <td style="border:1px solid #000;padding:6px;text-align:center;">${hrs}</td>
                    <td style="border:1px solid #000;padding:6px;">${facultyName}</td>
                </tr>`;
            }).join('');
        };

        // Class incharge / tutors from assignment
        const ciName = classAssignment?.classIncharge?.name ? `${classAssignment.classIncharge.name}${classAssignment.classIncharge.specialization ? ', ' + classAssignment.classIncharge.specialization : ''}` : 'Not assigned';
        const tutorNames = classAssignment?.tutors?.length > 0
            ? classAssignment.tutors.map(t => `${t.name}${t.specialization ? ', ' + t.specialization : ''}`).join('<br/>')
            : 'Not assigned';

        // Room info
        const roomName = classAssignment?.assignedRoom?.name || classAssignment?.assignedRoom || '';

        const htmlContent = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; padding: 20px; width: 100%;">
            <div style="text-align:center;margin-bottom:10px;">
                <h3 style="margin:0;text-decoration:underline;font-size:16px;letter-spacing:1px;">DEPARTMENT OF ${dept.toUpperCase()}</h3>
                <h4 style="margin:8px 0 0;font-size:14px;">CLASS TIMETABLE</h4>
            </div>

            <div style="display:flex;justify-content:space-between;margin:10px 0;font-size:12px;">
                <div>
                    <span>Class: <strong>Sem ${sem} - ${dept} - ${sec}</strong></span><br/>
                    <span>Semester: <strong>${sem}</strong></span>
                </div>
                <div style="text-align:right;">
                    <span>w.e.f.: <strong>${new Date().toLocaleDateString('en-IN')}</strong></span><br/>
                    <span>Class Room: <strong>${roomName}</strong></span>
                </div>
            </div>

            <table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;">
                <thead>
                    <tr>${headerRow1}</tr>
                    <tr>${headerRow2}</tr>
                </thead>
                <tbody>
                    ${bodyRows}
                </tbody>
            </table>

            <table style="width:100%;border-collapse:collapse;margin:20px 0 10px;font-size:12px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th style="border:1px solid #000;padding:6px;">CONTENT</th>
                        <th style="border:1px solid #000;padding:6px;">SUB. CODE</th>
                        <th style="border:1px solid #000;padding:6px;">SUBJECT NAME</th>
                        <th style="border:1px solid #000;padding:6px;">NO. OF HOURS</th>
                        <th style="border:1px solid #000;padding:6px;">FACULTY INCHARGE</th>
                    </tr>
                </thead>
                <tbody>
                    ${buildSubjectRows(theory, 'THEORY')}
                    ${buildSubjectRows(practical, 'PRACTICAL')}
                    ${buildSubjectRows(general, 'GENERAL')}
                    <tr>
                        <td colspan="4" style="border:1px solid #000;padding:6px;text-align:right;font-weight:bold;">Class Incharge</td>
                        <td style="border:1px solid #000;padding:6px;font-weight:bold;">${ciName}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="border:1px solid #000;padding:6px;text-align:right;font-weight:bold;">Tutors</td>
                        <td style="border:1px solid #000;padding:6px;">${tutorNames}</td>
                    </tr>
                </tbody>
            </table>
        </div>`;

        const container = document.createElement('div');
        container.innerHTML = htmlContent;
        document.body.appendChild(container);

        const opt = {
            margin: [5, 5, 5, 5],
            filename: `Timetable_${dept}_Sem${sem}_Sec${sec}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(container).save().then(() => {
            document.body.removeChild(container);
        });
    };

    // Fetch faculty list for management
    useEffect(() => {
        if (view === 'faculty') {
            fetchFaculty();
        }
    }, [view]);

    // Fetch subjects and classrooms when view changes
    useEffect(() => {
        if (view === 'subjects') {
            fetchSubjects();
        } else if (view === 'rooms') {
            fetchClassrooms();
        } else if (view === 'assignments') {
            fetchClassAssignment();
            fetchClassrooms();
        } else if (view === 'generate') {
            fetchClassrooms();
            fetchClassAssignment();
            fetchSubjects();
        }
        fetchFaculty();
    }, [view, dept, sem, sec]);

    const fetchFaculty = async () => {
        try {
            const res = await api.get('/data/faculty');
            setFacultyList(res.data);
        } catch (error) {
            console.error('Error fetching faculty:', error);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await api.get('/data/subjects');
            setSubjects(res.data);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchClassrooms = async () => {
        try {
            const res = await api.get('/data/classrooms');
            setClassrooms(res.data);
        } catch (error) {
            console.error('Error fetching classrooms:', error);
        }
    };

    const fetchFacultySchedule = async (fId) => {
        if (!fId) return;
        try {
            const res = await api.get(`/scheduler/faculty/${fId}`);
            setFacultySchedule(res.data);
        } catch (error) {
            console.error('Error fetching faculty schedule:', error);
        }
    };

    const fetchClassAssignment = async () => {
        try {
            const res = await api.get('/data/assignments', {
                params: {
                    department: dept,
                    semester: Number(sem),
                    section: sec
                }
            });
            setClassAssignment(res.data);
        } catch (error) {
            console.error('Error fetching class assignment:', error);
        }
    };

    const fetchTimetable = async () => {
        try {
            const res = await api.get('/scheduler', { params: { department: dept, semester: sem, section: isDeptMode ? undefined : sec } });
            if (res.data) {
                if (isDeptMode) {
                    setDeptTimetables(res.data);
                    setTimetable([]);
                } else {
                    setTimetable(res.data);
                    setDeptTimetables([]);
                    fetchClassAssignment();
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    const handleGenerate = async () => {
        setLoading(true);
        setMsg('');
        try {
            if (isDeptMode) {
                const res = await api.post('/scheduler/generate-department', {
                    department: dept,
                    semester: Number(sem)
                });
                if (res.data.timetables) {
                    setDeptTimetables(res.data.timetables);
                    setTimetable([]);
                    if (res.data.warnings && res.data.warnings.length > 0) {
                        setMsg(`Generated with warnings: ${res.data.warnings.join('; ')}`);
                    } else {
                        setMsg('Department-wide Timetables Generated Successfully!');
                    }
                }
            } else {
                const roomId = document.getElementById('gen-room-select')?.value;
                const res = await api.post('/scheduler/generate', {
                    department: dept,
                    semester: Number(sem),
                    section: sec,
                    roomId: roomId === "" ? undefined : roomId
                });
                const data = res.data;
                if (data.timetable) {
                    setTimetable(data.timetable);
                    setDeptTimetables([]);
                    if (data.warnings && data.warnings.length > 0) {
                        setMsg('Timetable Generated with warnings: ' + data.warnings.join('; '));
                    } else {
                        setMsg('Timetable Generated Successfully!');
                    }
                }
                fetchClassAssignment();
            }
        } catch (error) {
            setMsg('Error generating timetable: ' + (error.response?.data?.message || error.message));
            console.error(error);
        }
        setLoading(false);
    };

    const handleDownloadDeptPDF = () => {
        if (!deptTimetables || deptTimetables.length === 0) return;

        const sections = [...new Set(deptTimetables.map(t => t.section))].sort();
        const container = document.createElement('div');
        container.style.width = '1000px'; // Set a fixed width for consistent PDF generation

        sections.forEach((sectionName, idx) => {
            const sectionTT = deptTimetables.filter(t => t.section === sectionName);
            const sectionContent = createTimetableHTML(sectionTT, sectionName, idx === 0);
            const sectionDiv = document.createElement('div');
            sectionDiv.innerHTML = sectionContent;
            if (idx > 0) sectionDiv.style.pageBreakBefore = 'always';
            container.appendChild(sectionDiv);
        });

        document.body.appendChild(container);

        const opt = {
            margin: [5, 5, 5, 5],
            filename: `Timetable_${dept}_Sem${sem}_FullDept.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(container).save().then(() => {
            document.body.removeChild(container);
        });
    };

    const createTimetableHTML = (ttData, sectionName, isFirst = true) => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayMap = { 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday' };
        const periods = [
            { label: '9.15-10.05', period: 1 },
            { label: '10.05-10.55', period: 2 },
            { label: '11.15-12.05', period: 3, breakBefore: 'BREAK' },
            { label: '12.05-12.55', period: 4 },
            { label: '2.00-2.50', period: 5, breakBefore: 'LUNCH BREAK' },
            { label: '2.50-3.40', period: 6 },
            { label: '3.40-4.30', period: 7 },
        ];

        let headerRow1 = '<th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">Day</th>';
        let headerRow2 = '<th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">Hour</th>';

        periods.forEach((p, idx) => {
            if (p.breakBefore) headerRow1 += `<th rowspan="2" style="border:1px solid #000;padding:4px;text-align:center;font-weight:bold;writing-mode:vertical-rl;letter-spacing:2px;background:#f0f0f0;width:25px;">${p.breakBefore}</th>`;
            headerRow1 += `<th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${idx + 1}</th>`;
            headerRow2 += `<th style="border:1px solid #000;padding:6px;text-align:center;font-size:11px;">${p.label}</th>`;
        });

        let bodyRows = '';
        days.forEach((dayFull, dayIdx) => {
            const dayShort = Object.keys(dayMap).find(k => dayMap[k] === dayFull);
            const dayData = ttData.find(t => t.day === dayShort);
            let row = `<td style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">${dayFull}</td>`;
            periods.forEach((p) => {
                if (p.breakBefore && dayIdx === 0) row += `<td rowspan="${days.length}" style="border:1px solid #000;padding:4px;text-align:center;font-weight:bold;writing-mode:vertical-rl;letter-spacing:2px;background:#f0f0f0;width:25px;">${p.breakBefore}</td>`;
                const slot = dayData?.slots?.find(s => s.period === p.period);
                let cellContent = (slot && slot.subject && slot.type !== 'Free') ? (slot.subject.code || slot.subject.name || '') : '';
                row += `<td style="border:1px solid #000;padding:6px;text-align:center;font-size:12px;">${cellContent}</td>`;
            });
            bodyRows += `<tr>${row}</tr>`;
        });

        const relevantSubjectsSummary = subjects.filter(compSub =>
            compSub.department === dept && Number(compSub.semester) === Number(sem)
        ).map(sub => {
            const subId = sub._id.toString();
            let schedHrs = 0;
            ttData.forEach(day => {
                day.slots.forEach(slot => {
                    if (slot.subject && (slot.subject._id?.toString() === subId || slot.subject?.toString() === subId)) {
                        schedHrs++;
                    }
                });
            });
            return {
                ...sub,
                scheduledHours: schedHrs,
                facultyName: sub.faculty ? (sub.faculty.name + (sub.faculty.specialization ? `, ${sub.faculty.specialization}` : '')) : 'N/A'
            };
        });

        const theory = relevantSubjectsSummary.filter(s => s.contentType === 'Theory');
        const practical = relevantSubjectsSummary.filter(s => s.contentType === 'Practical');
        const general = relevantSubjectsSummary.filter(s => s.contentType === 'General');

        let summaryRows = '';
        const addGroup = (list, label) => {
            list.forEach((sub, idx) => {
                summaryRows += `
                    <tr>
                        ${idx === 0 ? `<td rowspan="${list.length}" style="border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">${label}</td>` : ''}
                        <td style="border:1px solid #000;padding:6px;text-align:center;">${sub.code}</td>
                        <td style="border:1px solid #000;padding:6px;">${sub.name}</td>
                        <td style="border:1px solid #000;padding:6px;text-align:center;">${sub.scheduledHours} / ${sub.hoursPerWeek}</td>
                        <td style="border:1px solid #000;padding:6px;">${sub.facultyName}</td>
                    </tr>
                `;
            });
        };
        if (theory.length > 0) addGroup(theory, 'THEORY');
        if (practical.length > 0) addGroup(practical, 'PRACTICAL');
        if (general.length > 0) addGroup(general, 'GENERAL');

        return `
            <div style="font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; padding: 20px; margin-bottom: 20px;">
                <div style="text-align:center;margin-bottom:10px;">
                    <h3 style="margin:0;text-decoration:underline;font-size:16px;">DEPARTMENT OF ${dept.toUpperCase()}</h3>
                    <h4 style="margin:8px 0 0;font-size:14px;">CLASS TIMETABLE - SECTION ${sectionName}</h4>
                </div>
                <div style="display:flex;justify-content:space-between;margin:10px 0;font-size:12px;">
                    <div>Class: <strong>Sem ${sem} - ${dept} - ${sectionName}</strong></div>
                    <div style="text-align:right;">Date: <strong>${new Date().toLocaleDateString('en-IN')}</strong></div>
                </div>
                <table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;">
                    <thead><tr>${headerRow1}</tr><tr>${headerRow2}</tr></thead>
                    <tbody>${bodyRows}</tbody>
                </table>
                <div style="margin-top:20px;">
                    <table style="width:100%;border-collapse:collapse;font-size:11px;">
                        <thead>
                            <tr style="background:#f0f0f0;">
                                <th style="border:1px solid #000;padding:6px;">CONTENT</th>
                                <th style="border:1px solid #000;padding:6px;">SUB. CODE</th>
                                <th style="border:1px solid #000;padding:6px;">SUBJECT NAME</th>
                                <th style="border:1px solid #000;padding:6px;">HRS (SCHED/REQ)</th>
                                <th style="border:1px solid #000;padding:6px;">FACULTY INCHARGE</th>
                            </tr>
                        </thead>
                        <tbody>${summaryRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    };

    const SubjectSummaryTable = ({ timetable, assignment, allSubjects }) => {
        // Calculate scheduled hours per subject
        const scheduledHoursMap = new Map();
        timetable.forEach(day => {
            day.slots.forEach(slot => {
                if (slot.subject && slot.subject._id) {
                    const subId = slot.subject._id;
                    scheduledHoursMap.set(subId, (scheduledHoursMap.get(subId) || 0) + 1);
                }
            });
        });

        // Filter and merge with all subjects for this dept/sem
        // We filter by dept and sem (keeping in mind sem is a number in state)
        const relevantSubjects = allSubjects.filter(compSub =>
            compSub.department === dept && Number(compSub.semester) === Number(sem)
        ).map(sub => ({
            ...sub,
            scheduledHours: scheduledHoursMap.get(sub._id) || 0,
            facultyName: sub.faculty?.name + (sub.faculty?.specialization ? `, ${sub.faculty.specialization}` : '')
        }));

        const theory = relevantSubjects.filter(s => s.contentType === 'Theory');
        const practical = relevantSubjects.filter(s => s.contentType === 'Practical');
        const general = relevantSubjects.filter(s => s.contentType === 'General');

        const totalScheduled = relevantSubjects.reduce((acc, curr) => acc + curr.scheduledHours, 0);
        const totalRequired = relevantSubjects.reduce((acc, curr) => acc + curr.hoursPerWeek, 0);

        return (
            <div className="card" style={{ marginTop: '30px', padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--color-primary)', color: 'white' }}>
                            <th style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>CONTENT</th>
                            <th style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>SUB. CODE</th>
                            <th style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>SUBJECT NAME</th>
                            <th style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>HRS (SCHED/REQ)</th>
                            <th style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>FACULTY INCHARGE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Theory Section */}
                        {theory.map((sub, idx) => (
                            <tr key={`theory-${idx}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
                                {idx === 0 && <td rowSpan={theory.length} style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', verticalAlign: 'middle' }}>THEORY</td>}
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{sub.code}</td>
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{sub.name}</td>
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', color: sub.scheduledHours < sub.hoursPerWeek ? 'var(--color-error)' : 'inherit', fontWeight: sub.scheduledHours < sub.hoursPerWeek ? 'bold' : 'normal' }}>
                                    {sub.scheduledHours} / {sub.hoursPerWeek}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{sub.facultyName || sub.faculty?.name || 'N/A'}</td>
                            </tr>
                        ))}
                        {/* Practical Section */}
                        {practical.map((sub, idx) => (
                            <tr key={`practical-${idx}`} style={{ background: 'rgba(255,255,255,0.05)' }}>
                                {idx === 0 && <td rowSpan={practical.length} style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', verticalAlign: 'middle' }}>PRACTICAL</td>}
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{sub.code}</td>
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{sub.name}</td>
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', color: sub.scheduledHours < sub.hoursPerWeek ? 'var(--color-error)' : 'inherit', fontWeight: sub.scheduledHours < sub.hoursPerWeek ? 'bold' : 'normal' }}>
                                    {sub.scheduledHours} / {sub.hoursPerWeek}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{sub.facultyName || sub.faculty?.name || 'N/A'}</td>
                            </tr>
                        ))}
                        {/* General Section */}
                        {general.map((sub, idx) => (
                            <tr key={`general-${idx}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
                                {idx === 0 && <td rowSpan={general.length} style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', verticalAlign: 'middle' }}>GENERAL</td>}
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{sub.code}</td>
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{sub.name}</td>
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', color: sub.scheduledHours < sub.hoursPerWeek ? 'var(--color-error)' : 'inherit', fontWeight: sub.scheduledHours < sub.hoursPerWeek ? 'bold' : 'normal' }}>
                                    {sub.scheduledHours} / {sub.hoursPerWeek}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{sub.facultyName || sub.faculty?.name || 'N/A'}</td>
                            </tr>
                        ))}
                        {/* Footer Assignments */}
                        <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <td colSpan={4} style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', fontWeight: 'bold' }}>Class Incharge</td>
                            <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {assignment.classIncharge?.name ? `${assignment.classIncharge.name}${assignment.classIncharge.specialization ? `, ${assignment.classIncharge.specialization}` : ''}` : 'Not assigned'}
                            </td>
                        </tr>
                        <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <td colSpan={4} style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', fontWeight: 'bold' }}>Tutors</td>
                            <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {assignment.tutors?.length > 0
                                    ? assignment.tutors.map(t => `${t.name}${t.specialization ? `, ${t.specialization}` : ''}`).join(' / ')
                                    : 'Not assigned'}
                            </td>
                        </tr>
                        <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                            <td colSpan={3} style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Weekly Hours</td>
                            <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                {totalScheduled} / {totalRequired}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
                                {totalScheduled === 42 ? '✅ Full Schedule' : (42 - totalScheduled) + ' slots remaining'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div>
            <Navbar />
            <div className="container">
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h2>Admin Dashboard</h2>
                    <p>Welcome, {user.name}!</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '20px' }}>

                    {/* Sidebar / Controls */}
                    <div className="card">
                        <h3>Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                            <button className={`btn ${view === 'generate' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('generate')}>Generate Timetable</button>
                            <button className={`btn ${view === 'subjects' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('subjects')}>Manage Subjects</button>
                            <button className={`btn ${view === 'rooms' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('rooms')}>Manage Classrooms</button>
                            <button className={`btn ${view === 'faculty' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('faculty')}>Manage Faculty</button>
                            <button className={`btn ${view === 'assignments' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('assignments')}>Class Assignments</button>
                            <button className={`btn ${view === 'facultyView' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('facultyView')}>View Faculty Schedule</button>
                        </div>

                        {view === 'generate' && (
                            <div style={{ marginTop: '30px' }}>
                                <h4>Configuration</h4>
                                <div className="input-group" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="checkbox" id="dept-mode" checked={isDeptMode} onChange={e => setIsDeptMode(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <label htmlFor="dept-mode" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>Department-wide Generation</label>
                                </div>
                                <div className="input-group" style={{ marginTop: '15px' }}>
                                    <label className="input-label">Department</label>
                                    <input className="input-field" value={dept} onChange={e => setDept(e.target.value)} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Semester</label>
                                    <input type="number" className="input-field" value={sem} onChange={e => setSem(e.target.value)} />
                                </div>
                                {!isDeptMode && (
                                    <>
                                        <div className="input-group">
                                            <label className="input-label">Section</label>
                                            <input className="input-field" value={sec} onChange={e => setSec(e.target.value)} />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Assigned Room (Home)</label>
                                            <select id="gen-room-select" className="input-field" defaultValue={classAssignment?.assignedRoom?._id || classAssignment?.assignedRoom}>
                                                <option value="">Select Room</option>
                                                {classrooms.filter(r => r.type === 'classroom').map(r => (
                                                    <option key={r._id} value={r._id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} onClick={handleGenerate} disabled={loading}>
                                    {loading ? 'Generating...' : isDeptMode ? 'Generate Full Dept' : 'Generate Schedule'}
                                </button>
                                {msg && <p style={{ marginTop: '10px', fontSize: '0.85rem', color: msg.includes('warning') ? 'orange' : msg.includes('Error') ? 'var(--color-error)' : 'var(--color-success)' }}>{msg}</p>}
                            </div>
                        )}

                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={fetchTimetable}>Load Existing</button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div>
                        {view === 'generate' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2>Timetable Preview <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        ({dept} - Sem {sem} {isDeptMode ? '- Full Dept' : `- Sec ${sec}`})
                                    </span></h2>
                                    {(timetable.length > 0 || deptTimetables.length > 0) && (
                                        <button className="btn btn-primary" onClick={isDeptMode ? handleDownloadDeptPDF : handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            📄 Download PDF
                                        </button>
                                    )}
                                </div>

                                {isDeptMode ? (
                                    deptTimetables.length > 0 ? (
                                        <div>
                                            {[...new Set(deptTimetables.map(t => t.section))].sort().map(sectionName => {
                                                const sectionTT = deptTimetables.filter(t => t.section === sectionName);
                                                return (
                                                    <div key={sectionName} style={{ marginBottom: '50px', borderBottom: '2px dashed rgba(255,255,255,0.1)', paddingBottom: '30px' }}>
                                                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                                            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Section {sectionName}</h3>
                                                        </div>
                                                        <TimetableGrid timetable={sectionTT} />
                                                        <SubjectSummaryTable timetable={sectionTT} assignment={{}} allSubjects={subjects} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            No department-wide timetables generated or loaded yet.
                                        </div>
                                    )
                                ) : (
                                    timetable.length > 0 ? (
                                        <div ref={timetableRef}>
                                            <div style={{ textAlign: 'center', marginBottom: '15px', padding: '10px' }}>
                                                <h3 style={{ margin: 0 }}>{dept} - Semester {sem} - Section {sec}</h3>
                                                <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Weekly Timetable</p>
                                            </div>
                                            <TimetableGrid timetable={timetable} />
                                            <SubjectSummaryTable timetable={timetable} assignment={classAssignment} allSubjects={subjects} />
                                        </div>
                                    ) : (
                                        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            No timetable generated or loaded yet.
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {view === 'subjects' && (
                            <div className="card">
                                <h3>Manage Subjects</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                                    {/* Add Subject Form */}
                                    <div className="glass-card" style={{ padding: '20px' }}>
                                        <h4>Add New Subject</h4>
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const formData = new FormData(e.target);
                                            const data = Object.fromEntries(formData.entries());
                                            // Convert numbers
                                            const payload = {
                                                ...data,
                                                hoursPerWeek: Number(data.hoursPerWeek),
                                                semester: Number(data.semester)
                                            };
                                            if (!payload.faculty || payload.faculty === "") delete payload.faculty;

                                            try {
                                                await api.post('/data/subjects', payload);
                                                alert('Subject Added!');
                                                e.target.reset();
                                                fetchSubjects(); // Refresh the list
                                            } catch (err) {
                                                const msg = err.response?.data?.message || 'Error adding subject';
                                                alert(msg);
                                                console.error(err);
                                            }

                                        }}>
                                            <div className="input-group">
                                                <label className="input-label">Name</label>
                                                <input name="name" className="input-field" required placeholder="e.g. Data Structures" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Code</label>
                                                <input name="code" className="input-field" required placeholder="e.g. 24CS404" />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <div className="input-group">
                                                    <label className="input-label">Content Type</label>
                                                    <select name="contentType" className="input-field">
                                                        <option value="Theory">Theory</option>
                                                        <option value="Practical">Practical</option>
                                                        <option value="General">General</option>
                                                    </select>
                                                </div>
                                                <div className="input-group">
                                                    <label className="input-label">Hours / Week</label>
                                                    <input name="hoursPerWeek" type="number" className="input-field" required defaultValue={4} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <div className="input-group">
                                                    <label className="input-label">Department</label>
                                                    <input name="department" className="input-field" required placeholder="CSE" defaultValue={dept} />
                                                </div>
                                                <div className="input-group">
                                                    <label className="input-label">Semester</label>
                                                    <input name="semester" type="number" className="input-field" required defaultValue={sem} min={1} max={8} />
                                                </div>
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Faculty Incharge</label>
                                                <select name="faculty" className="input-field">
                                                    <option value="">Select Faculty</option>
                                                    {facultyList.map(f => (
                                                        <option key={f._id} value={f._id}>{f.name} {f.specialization && `(${f.specialization})`}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '10px' }}>Add Subject</button>
                                        </form>
                                    </div>

                                    {/* Subject List */}
                                    <div className="glass-card" style={{ padding: '20px' }}>
                                        <h4>Existing Subjects</h4>
                                        <div style={{ marginTop: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                                            {subjects.length > 0 ? (
                                                subjects.map(subject => (
                                                    <div key={subject._id} style={{ padding: '10px', marginBottom: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold' }}>{subject.name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                                Code: {subject.code} | {subject.contentType || 'Theory'} | {subject.hoursPerWeek || subject.lectureHours} hrs/week
                                                            </div>
                                                            {subject.faculty && (
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginTop: '4px' }}>
                                                                    Faculty: {subject.faculty.name} {subject.faculty.specialization && `(${subject.faculty.specialization})`}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                                                            onClick={async () => {
                                                                if (window.confirm('Delete this subject?')) {
                                                                    try {
                                                                        await api.delete(`/data/subjects/${subject._id}`);
                                                                        fetchSubjects();
                                                                    } catch (err) {
                                                                        alert('Error deleting subject');
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No subjects added yet</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {view === 'rooms' && (
                            <div className="card">
                                <h3>Manage Classrooms</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                                    <div className="glass-card" style={{ padding: '20px' }}>
                                        <h4>Add New Room</h4>
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const formData = new FormData(e.target);
                                            const data = Object.fromEntries(formData.entries());
                                            data.capacity = Number(data.capacity);

                                            try {
                                                await api.post('/data/classrooms', data);
                                                alert('Room Added!');
                                                e.target.reset();
                                                fetchClassrooms(); // Refresh the list
                                            } catch (err) {
                                                const msg = err.response?.data?.message || 'Error adding room';
                                                alert(msg);
                                                console.error(err);
                                            }

                                        }}>
                                            <div className="input-group">
                                                <label className="input-label">Room Name</label>
                                                <input name="name" className="input-field" required placeholder="e.g. LH-101" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Capacity</label>
                                                <input name="capacity" type="number" className="input-field" required defaultValue={60} />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Type</label>
                                                <select name="type" className="input-field">
                                                    <option value="classroom">Classroom</option>
                                                    <option value="lab">Laboratory</option>
                                                </select>
                                            </div>
                                            <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Add Room</button>
                                        </form>
                                    </div>

                                    {/* Classroom List */}
                                    <div className="glass-card" style={{ padding: '20px' }}>
                                        <h4>Existing Classrooms</h4>
                                        <div style={{ marginTop: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                                            {classrooms.length > 0 ? (
                                                classrooms.map(room => (
                                                    <div key={room._id} style={{ padding: '10px', marginBottom: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold' }}>{room.name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                                Type: {room.type} | Capacity: {room.capacity}
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                                                            onClick={async () => {
                                                                if (window.confirm('Delete this classroom?')) {
                                                                    try {
                                                                        await api.delete(`/data/classrooms/${room._id}`);
                                                                        fetchClassrooms();
                                                                    } catch (err) {
                                                                        alert('Error deleting classroom');
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No classrooms added yet</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {view === 'faculty' && (
                            <div className="card">
                                <h3>Manage Faculty</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                                    {/* Add Faculty Form */}
                                    <div className="glass-card" style={{ padding: '20px' }}>
                                        <h4>Add New Faculty</h4>
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const formData = new FormData(e.target);
                                            const data = Object.fromEntries(formData.entries());
                                            data.role = 'teacher';

                                            // Extract teacher roles (simplified for admin form: assume subject_teacher by default)
                                            data.teacherRoles = ['subject_teacher'];

                                            try {
                                                await api.post('/auth/register', data);
                                                alert('Faculty Added!');
                                                e.target.reset();
                                                fetchFaculty();
                                            } catch (err) {
                                                const msg = err.response?.data?.message || 'Error adding faculty';
                                                alert(msg);
                                                console.error(err);
                                            }
                                        }}>
                                            <div className="input-group">
                                                <label className="input-label">Name</label>
                                                <input name="name" className="input-field" required placeholder="Professor Name" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Email</label>
                                                <input name="email" type="email" className="input-field" required placeholder="email@example.com" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Phone Number</label>
                                                <input name="phoneNumber" className="input-field" placeholder="1234567890" />
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Password</label>
                                                <input name="password" type="password" className="input-field" required placeholder="******" />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <div className="input-group">
                                                    <label className="input-label">Department</label>
                                                    <input name="department" className="input-field" required placeholder="CSE" />
                                                </div>
                                                <div className="input-group">
                                                    <label className="input-label">Specialization</label>
                                                    <input name="specialization" className="input-field" placeholder="AP,CSE" />
                                                </div>
                                            </div>
                                            <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '10px' }}>Add Faculty</button>
                                        </form>
                                    </div>

                                    {/* Faculty List */}
                                    <div className="glass-card" style={{ padding: '20px' }}>
                                        <h4>Existing Faculty</h4>
                                        <div style={{ marginTop: '15px', maxHeight: '500px', overflowY: 'auto' }}>
                                            {facultyList.length > 0 ? (
                                                facultyList.map(f => (
                                                    <div key={f._id} style={{ padding: '10px', marginBottom: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold' }}>{f.name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                                {f.email} | {f.phoneNumber || 'No phone'} | {f.department}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                                                                {f.specialization || 'No specialization'}
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                                                            onClick={async () => {
                                                                if (window.confirm('Delete this faculty member?')) {
                                                                    try {
                                                                        await api.delete(`/data/faculty/${f._id}`);
                                                                        fetchFaculty();
                                                                    } catch (err) {
                                                                        alert('Error deleting faculty');
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No faculty added yet</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {view === 'assignments' && (
                            <div className="card">
                                <h3>Class Assignments <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>({dept} - Sem {sem} - Sec {sec})</span></h3>
                                <div className="glass-card" style={{ padding: '20px', marginTop: '20px', maxWidth: '600px' }}>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        const data = Object.fromEntries(formData.entries());

                                        // Handle multi-select for tutors
                                        const tutors = Array.from(e.target.tutors.selectedOptions).map(o => o.value);

                                        const cleanPayload = {
                                            department: dept,
                                            semester: Number(sem),
                                            section: sec,
                                            classIncharge: data.classIncharge || undefined,
                                            tutors: tutors.filter(t => t !== ""),
                                            seminarIncharge: data.seminarIncharge || undefined,
                                            librarian: data.librarian || undefined,
                                            assignedRoom: data.assignedRoom || undefined
                                        };

                                        // Remove undefined fields
                                        Object.keys(cleanPayload).forEach(key =>
                                            cleanPayload[key] === undefined && delete cleanPayload[key]
                                        );

                                        try {
                                            await api.post('/data/assignments', cleanPayload);
                                            alert('Assignments Updated!');
                                            fetchClassAssignment();
                                        } catch (err) {
                                            alert('Error updating assignments');
                                        }
                                    }}>
                                        <div className="input-group">
                                            <label className="input-label">Assigned Room (Theory/Home)</label>
                                            <select name="assignedRoom" className="input-field" defaultValue={classAssignment?.assignedRoom?._id || classAssignment?.assignedRoom}>
                                                <option value="">Select Room</option>
                                                {classrooms.filter(r => r.type === 'classroom').map(r => (
                                                    <option key={r._id} value={r._id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Class Incharge</label>
                                            <select name="classIncharge" className="input-field" defaultValue={classAssignment.classIncharge?._id}>
                                                <option value="">Select Faculty</option>
                                                {facultyList.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Tutors (Cmd/Ctrl + Click to select multiple)</label>
                                            <select name="tutors" className="input-field" multiple style={{ height: '100px' }} defaultValue={classAssignment.tutors?.map(t => t._id)}>
                                                {facultyList.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Seminar Incharge</label>
                                            <select name="seminarIncharge" className="input-field" defaultValue={classAssignment.seminarIncharge?._id}>
                                                <option value="">Select Faculty</option>
                                                {facultyList.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Librarian</label>
                                            <select name="librarian" className="input-field" defaultValue={classAssignment.librarian?._id}>
                                                <option value="">Select Faculty</option>
                                                {facultyList.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                                            </select>
                                        </div>
                                        <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '10px' }}>Save Assignments</button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {view === 'facultyView' && (
                            <div className="card">
                                <h3>Faculty Schedule Overview</h3>

                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', marginTop: '10px' }}>
                                    <button className={`btn ${facultySubView === 'single' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFacultySubView('single')}>Single View</button>
                                    <button className={`btn ${facultySubView === 'bulk' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFacultySubView('bulk')}>Bulk Email View</button>
                                </div>

                                {facultySubView === 'single' ? (
                                    <>
                                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', margin: '20px 0' }}>
                                            <div className="input-group" style={{ minWidth: '200px', flex: 1 }}>
                                                <label className="input-label">Select Faculty</label>
                                                <select
                                                    className="input-field"
                                                    value={selectedFaculty}
                                                    onChange={(e) => {
                                                        setSelectedFaculty(e.target.value);
                                                        fetchFacultySchedule(e.target.value);
                                                    }}
                                                >
                                                    <option value="">-- Choose Teacher --</option>
                                                    {facultyList.map(f => (
                                                        <option key={f._id} value={f._id}>{f.name} {f.specialization && `(${f.specialization})`}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="input-group" style={{ minWidth: '120px' }}>
                                                <label className="input-label">Sem</label>
                                                <select className="input-field" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                                                    <option value="">All Sem</option>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="input-group" style={{ minWidth: '120px' }}>
                                                <label className="input-label">Section</label>
                                                <select className="input-field" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                                                    <option value="">All Sections</option>
                                                    {['A', 'B', 'C', 'D', 'E'].map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {selectedFaculty && (
                                                <div style={{ alignSelf: 'flex-end', marginBottom: '4px', display: 'flex', gap: '10px' }}>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                                        onClick={async () => {
                                                            try {
                                                                setMsg('Sending notification...');
                                                                const res = await api.post('/notifications/send', {
                                                                    recipientId: selectedFaculty,
                                                                    message: `Your schedule has been updated. Please check your dashboard for the latest timetable.`,
                                                                    type: 'schedule_update'
                                                                });
                                                                setMsg(res.data.message || 'Notification Sent!');
                                                                setTimeout(() => setMsg(''), 5000);
                                                            } catch (err) {
                                                                setMsg('Error: ' + (err.response?.data?.message || err.message));
                                                            }
                                                        }}
                                                    >
                                                        🔔 Send notification
                                                    </button>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                                        disabled={loading}
                                                        onClick={async () => {
                                                            if (!selectedFaculty) return;
                                                            setLoading(true);
                                                            setMsg('Detecting next period and sending alert...');
                                                            try {
                                                                const res = await api.post('/scheduler/send-targeted-alert', {
                                                                    facultyId: selectedFaculty,
                                                                    forcePeriod: forcePeriod ? Number(forcePeriod) : undefined
                                                                });
                                                                setMsg(`🚀 ${res.data.message}`);
                                                                setTimeout(() => setMsg(''), 5000);
                                                            } catch (err) {
                                                                setMsg('Error: ' + (err.response?.data?.message || err.message));
                                                            }
                                                            setLoading(false);
                                                        }}
                                                    >
                                                        📧 Send Period Alert
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {facultySchedule.length > 0 ? (
                                            <div>
                                                <TimetableGrid
                                                    timetable={facultySchedule.map(dayData => ({
                                                        ...dayData,
                                                        slots: dayData.slots.filter(slot => {
                                                            if (filterSem && String(slot.semester) !== String(filterSem)) return false;
                                                            if (filterSection && slot.section !== filterSection) return false;
                                                            return true;
                                                        })
                                                    }))}
                                                    isFacultyView={true}
                                                />
                                                {(filterSem || filterSection) && (
                                                    <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                                        Showing filtered view: {filterSem ? `Sem ${filterSem}` : 'All Sem'} / {filterSection ? `Section ${filterSection}` : 'All Sections'}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            selectedFaculty && <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '20px' }}>No classes assigned to this faculty.</p>
                                        )}

                                        <div className="card" style={{ marginTop: '30px', background: 'rgba(var(--color-primary-rgb), 0.05)', border: '1px dashed var(--color-primary)' }}>
                                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                                🔔 Periodic Class Alerts
                                            </h4>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '15px' }}>
                                                Send proactive alerts to all faculty members who have classes in the upcoming period. 
                                                This will send an in-app notification and a mock SMS to their registered phone numbers.
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div className="input-group" style={{ marginBottom: 0 }}>
                                                    <select 
                                                        className="input-field" 
                                                        style={{ padding: '8px' }}
                                                        value={forcePeriod}
                                                        onChange={(e) => setForcePeriod(e.target.value)}
                                                    >
                                                        <option value="">Auto-detect Next Period</option>
                                                        {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                                            <option key={p} value={p}>Force Period {p}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button 
                                                    className="btn btn-primary"
                                                    disabled={loading}
                                                    onClick={async () => {
                                                        setLoading(true);
                                                        try {
                                                            const res = await api.post('/scheduler/send-alerts', {
                                                                forcePeriod: forcePeriod ? Number(forcePeriod) : undefined
                                                            });
                                                            setMsg(`Alerts Processed: ${res.data.count} notifications sent. ${res.data.message}`);
                                                            setTimeout(() => setMsg(''), 10000);
                                                        } catch (err) {
                                                            setMsg('Error sending alerts: ' + (err.response?.data?.message || err.message));
                                                        }
                                                        setLoading(false);
                                                    }}
                                                >
                                                    {loading ? 'Sending...' : '🚀 Send Period Alerts'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Bulk Email UI merged here */
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    if (selectedBulkFaculty.length === facultyList.length) {
                                                        setSelectedBulkFaculty([]);
                                                    } else {
                                                        setSelectedBulkFaculty(facultyList.map(f => f._id));
                                                    }
                                                }}
                                            >
                                                {selectedBulkFaculty.length === facultyList.length ? 'Deselect All' : 'Select All'}
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                disabled={selectedBulkFaculty.length === 0 || loading}
                                                onClick={async () => {
                                                    setLoading(true);
                                                    setMsg('Starting bulk email process...');
                                                    let successCount = 0;
                                                    let failCount = 0;

                                                    for (const fId of selectedBulkFaculty) {
                                                        try {
                                                            const faculty = facultyList.find(f => f._id === fId);
                                                            setMsg(`Sending to: ${faculty.name}...`);
                                                            const sRes = await api.get(`/scheduler/faculty/${fId}`);
                                                            const sData = sRes.data;
                                                            if (sData.length > 0) {
                                                                await api.post('/scheduler/email-faculty', {
                                                                    facultyId: fId,
                                                                    scheduleData: sData
                                                                });
                                                                successCount++;
                                                            } else {
                                                                failCount++;
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            failCount++;
                                                        }
                                                    }
                                                    setLoading(false);
                                                    setMsg(`Process Finish: ${successCount} Sent, ${failCount} Failed.`);
                                                    setSelectedBulkFaculty([]);
                                                    setTimeout(() => setMsg(''), 5000);
                                                }}
                                            >
                                                {loading ? 'Sending...' : `Email Selected (${selectedBulkFaculty.length})`}
                                            </button>
                                        </div>

                                        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                                        <th style={{ padding: '12px' }}>Select</th>
                                                        <th style={{ padding: '12px' }}>Faculty Name</th>
                                                        <th style={{ padding: '12px' }}>Department</th>
                                                        <th style={{ padding: '12px' }}>Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {facultyList.map(f => (
                                                        <tr key={f._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '12px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedBulkFaculty.includes(f._id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedBulkFaculty([...selectedBulkFaculty, f._id]);
                                                                        } else {
                                                                            setSelectedBulkFaculty(selectedBulkFaculty.filter(id => id !== f._id));
                                                                        }
                                                                    }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '12px' }}>{f.name}</td>
                                                            <td style={{ padding: '12px' }}>{f.department}</td>
                                                            <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{f.email}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AdminDashboard;
