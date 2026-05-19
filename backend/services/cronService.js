const cron = require('node-cron');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Classroom = require('../models/Classroom');
const { sendNotificationEmail } = require('./mailService');

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"],
          v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getYearString(semester) {
    const sem = parseInt(semester, 10);
    if(sem === 1 || sem === 2) return '1st year';
    if(sem === 3 || sem === 4) return '2nd year';
    if(sem === 5 || sem === 6) return '3rd year';
    if(sem === 7 || sem === 8) return '4th year';
    return `${sem}th sem`;
}

const startCronJobs = () => {
    console.log('--- Starting Cron Jobs for Period Alerts ---');

    // Cron syntax: minute hour * * * (runs every day at that time)
    // 1st 09:00 -> '0 9 * * *'
    // 2nd 10:00 -> '0 10 * * *'
    // 3rd 11:15 -> '15 11 * * *'
    // 4th 12:15 -> '15 12 * * *'
    // 5th 14:10 -> '10 14 * * *'
    // 6th 15:00 -> '0 15 * * *'
    // 7th 16:00 -> '0 16 * * *'

    const schedules = [
        { period: 1, cronTime: '0 9 * * *' },
        { period: 2, cronTime: '0 10 * * *' },
        { period: 3, cronTime: '15 11 * * *' },
        { period: 4, cronTime: '15 12 * * *' },
        { period: 5, cronTime: '10 14 * * *' },
        { period: 6, cronTime: '0 15 * * *' },
        { period: 7, cronTime: '0 16 * * *' },
    ];

    schedules.forEach(({ period, cronTime }) => {
        cron.schedule(cronTime, async () => {
            console.log(`[CRON] Triggering alerts for Period ${period} at ${new Date().toLocaleTimeString()}`);
            await sendAlertForPeriod(period);
        });
    });
};

const sendAlertForPeriod = async (targetPeriod) => {
    try {
        const now = new Date();
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentDay = daysShort[now.getDay()];

        if (currentDay === 'Sun') {
            console.log('[CRON] No classes today (Sunday)');
            return;
        }

        const timetables = await Timetable.find({ day: currentDay })
            .populate('slots.subject')
            .populate('slots.faculty')
            .populate('slots.room');

        const dayStr = String(now.getDate()).padStart(2, '0');
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const yearNum = now.getFullYear();
        const dateStr = `${dayStr}/${monthStr}/${yearNum}`;

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const timeStr = `${String(hours).padStart(2, '0')}.${minutes}${ampm}`;

        let alertCount = 0;
        const alertsToSend = []; // avoid duplicates if any

        for (const tt of timetables) {
            const slot = tt.slots.find(s => s.period === targetPeriod && s.faculty);
            if (slot && slot.faculty) {
                const faculty = slot.faculty;
                
                const yearStr = getYearString(tt.semester);
                const periodOrdinal = getOrdinal(targetPeriod);
                
                const roomName = slot.room ? slot.room.name : 'TBD';
                const deptLower = (tt.department || '').toLowerCase();
                const secLower = (tt.section || '').toLowerCase();

                const message = `${dateStr} \n${timeStr}\nyour next period : ${periodOrdinal} period\nyou have the class :  \n${yearStr} ${deptLower} ${secLower} \nroom no. ${roomName}`;
                const subject = `Class Alert for ${periodOrdinal} Period`;

                alertsToSend.push({ faculty, subject, message });
            }
        }

        // Send emails
        for (const alert of alertsToSend) {
            if (alert.faculty.email) {
                await sendNotificationEmail(alert.faculty.email, alert.subject, alert.message);
                console.log(`[CRON] Alert sent to ${alert.faculty.email} for period ${targetPeriod}`);
                alertCount++;
            } else {
                console.log(`[CRON] Faculty ${alert.faculty.name} has no email addr.`);
            }
        }
        
        console.log(`[CRON] Successfully sent ${alertCount} alerts for period ${targetPeriod}.`);
    } catch (error) {
        console.error('[CRON] Error sending alerts:', error);
    }
};

module.exports = { startCronJobs, sendAlertForPeriod };
