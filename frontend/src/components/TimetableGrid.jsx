import React from 'react';

const PERIODS = 7;
const TIME_SLOTS = [
    "09:00 - 10:00", // 1
    "10:00 - 11:00", // 2
    "11:00 - 11:15", // Break
    "11:15 - 12:15", // 3
    "12:15 - 13:00", // 4
    "13:00 - 14:10", // Lunch
    "14:10 - 15:00", // 5 (2:10)
    "15:00 - 16:00", // 6
    "16:00 - 17:00"  // 7 (Assuming 3-4 and 4-5 based on prompt it said 3-4 was last? Prompt Preview showed 3-4 as last column? Wait. Preview: 2:10-3, 3-4. That is 7 periods?)
];

// Re-evaluating Time Slots based on PROMPT PREVIEW:
// 9-10, 10-11, 11-11:15 (Break), 11:15-12:15, 12:15-1, 1-2:10 (Lunch), 2:10-3, 3-4.
// Periods:
// 1: 9-10
// 2: 10-11
// Break
// 3: 11:15-12:15
// 4: 12:15-1:00
// Lunch
// 5: 2:10-3:00
// 6: 3:00-4:00
// Wait, prompt said "7 teaching periods".
// My count: 1, 2, 3, 4, 5, 6. Only 6?
// Let's re-read prompt: "7 teaching periods per day".
// "3-4" is the last column in preview.
// Where is the 7th? 
// Maybe 4-5? Or 8-9?
// The prompt example shows Mon-Sat. Last column is 3-4.
// Columns: 9-10, 10-11, Break, 11:15-12:15, 12:15-1, Lunch, 2:10-3, 3-4.
// Periods: 1, 2, 3, 4, 5, 6.
// Maybe I missed one, or "7 periods" is a requirement that conflicts with the visual preview.
// "Period Structure: 7 teaching periods per day".
// "Preview: ... 3-4".
// Maybe 12:15-1 is Period 4. 1-2:10 is Lunch.
// 2:10-3 is Period 5.
// 3-4 is Period 6.
// If 7 periods are strictly required, I might need to add 4-5 PM?
// Or maybe the lunch is shorter? "Lunch 1:00 PM – 2:10 PM".
// I will follow the visual preview for now (6 periods + breaks) but allow for 7.
// Actually, if I add 4-5 PM, that would be the 7th period.
// I will adhere to "7 teaching periods" text requirement and add 4:00-5:00 PM as Period 7.

const DISPLAY_SLOTS = [
    { label: "09:00 - 10:00", type: 'period', period: 1 },
    { label: "10:00 - 11:00", type: 'period', period: 2 },
    { label: "11:00 - 11:15", type: 'break', name: 'Break' },
    { label: "11:15 - 12:15", type: 'period', period: 3 },
    { label: "12:15 - 13:00", type: 'period', period: 4 },
    { label: "13:00 - 14:10", type: 'break', name: 'Lunch' },
    { label: "14:10 - 15:00", type: 'period', period: 5 },
    { label: "15:00 - 16:00", type: 'period', period: 6 },
    { label: "16:00 - 17:00", type: 'period', period: 7 },
];

const TimetableGrid = ({ timetable, isFacultyView = false }) => {
    // timetable is array of day objects: { day: 'Mon', slots: [...] }
    // We need to map this to the grid.

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getSlotContent = (dayStr, periodNum) => {
        if (!timetable) return null;
        const dayData = timetable.find(t => t.day === dayStr);
        if (!dayData) return <span style={{ opacity: 0.3 }}>-</span>;

        const slot = dayData.slots.find(s => s.period === periodNum);
        if (!slot) return <span style={{ opacity: 0.3 }}>-</span>;

        if (slot.type === 'Free' || !slot.subject) return <span style={{ opacity: 0.3 }}>Free</span>;

        // If it's faculty view, show "Dept-Sem-Sec" instead of Faculty Name
        // The slot object might not have dept/sem/sec directly if it's from the student timetable structure
        // But for faculty schedule, we are fetching "Timetables" that have this info at the top level?
        // Wait, the "scheduler/faculty/:id" returns a LIST of Timetables (one per class per day).
        // Let's check how the data is structured coming into this component.
        // If it comes from getFacultySchedule, it returns Timetables.
        // BUT TimetableGrid expects { day: 'Mon', slots: [] }.
        // We need to verify if the FacultyDashboard is transforming the API response correctly.

        return (
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--color-secondary)' }}>{slot.subject.code || slot.subject.name}</div>
                {slot.room && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{slot.room.name}</div>}

                {isFacultyView ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                        {slot.department || dayData.department} - S{slot.semester || dayData.semester} - {slot.section || dayData.section}
                    </div>
                ) : (
                    slot.faculty && <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>{slot.faculty.name}</div>
                )}
            </div>
        );
    };

    return (
        <div className="glass-card" style={{ overflowX: 'auto', padding: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                    <tr>
                        <th style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Day / Time</th>
                        {DISPLAY_SLOTS.map((slot, index) => (
                            <th key={index} style={{
                                padding: '15px',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                background: slot.type === 'break' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                color: slot.type === 'break' ? 'var(--color-text-muted)' : 'var(--color-text-main)'
                            }}>
                                {slot.type === 'break' ? slot.name : slot.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {days.map(day => (
                        <tr key={day} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{day}</td>
                            {DISPLAY_SLOTS.map((slot, index) => {
                                if (slot.type === 'break') {
                                    return (
                                        <td key={index} style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                            {/* {slot.name} */}
                                        </td>
                                    )
                                }
                                return (
                                    <td key={index} style={{ padding: '10px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                        {getSlotContent(day, slot.period)}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TimetableGrid;
