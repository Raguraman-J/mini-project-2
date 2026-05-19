import { useState, useEffect, useContext } from 'react';
import Navbar from '../components/Navbar';
import AuthContext from '../context/AuthContext';
import TimetableGrid from '../components/TimetableGrid';
import api from '../utils/api';

const FacultyDashboard = () => {
    const { user } = useContext(AuthContext);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchFacultySchedule = async () => {
            try {
                const res = await api.get(`/scheduler/faculty/${user._id}`);
                setSchedule(res.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to load schedule');
                setLoading(false);
            }
        };

        const fetchNotifications = async () => {
            try {
                const res = await api.get('/notifications');
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.read).length);
            } catch (err) {
                console.error('Failed to fetch notifications', err);
            }
        };

        if (user?._id) {
            fetchFacultySchedule();
            fetchNotifications();
        }
    }, [user]);

    const handleMarkAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark notification as read', err);
        }
    };

    return (
        <div>
            <Navbar />
            <div className="container">
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>Faculty Dashboard</h2>
                        <p>Welcome, {user.name}!</p>
                        <p style={{ marginTop: '10px', color: 'var(--color-text-muted)' }}>
                            View your assigned classes and weekly schedule below.
                        </p>
                    </div>
                    <button
                        className="btn btn-secondary"
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => setShowNotifications(true)}
                    >
                        🔔 Notifications
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                background: 'var(--color-danger)',
                                color: 'white',
                                borderRadius: '50%',
                                padding: '2px 6px',
                                fontSize: '0.7rem'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>

                <div style={{ marginTop: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3>My Weekly Schedule</h3>
                    </div>

                    {loading ? (
                        <div className="card">Loading your schedule...</div>
                    ) : error ? (
                        <div className="card" style={{ color: 'var(--color-danger)' }}>{error}</div>
                    ) : schedule.length > 0 ? (
                        <TimetableGrid timetable={schedule} isFacultyView={true} />
                    ) : (
                        <div className="card">
                            <p>No classes assigned yet. Please contact the admin to assign you to classes.</p>
                        </div>
                    )}
                </div>

                {/* Notifications Modal */}
                {showNotifications && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000
                    }}>
                        <div className="glass-card" style={{ width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', padding: '30px', position: 'relative', background: '#1e293b', color: 'white' }}>
                            <button onClick={() => setShowNotifications(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            <h2 style={{ marginBottom: '20px' }}>Notifications</h2>

                            {notifications.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No notifications yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {notifications.map(n => (
                                        <div
                                            key={n._id}
                                            style={{
                                                padding: '15px',
                                                borderRadius: 'var(--radius-md)',
                                                background: n.read ? 'rgba(255,255,255,0.05)' : 'rgba(var(--color-primary-rgb), 0.1)',
                                                borderLeft: `4px solid ${n.read ? 'transparent' : 'var(--color-primary)'}`,
                                                cursor: n.read ? 'default' : 'pointer'
                                            }}
                                            onClick={() => !n.read && handleMarkAsRead(n._id)}
                                        >
                                            <p style={{ fontSize: '0.95rem', marginBottom: '5px' }}>{n.message}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <small style={{ color: 'var(--color-text-muted)' }}>
                                                    {new Date(n.createdAt).toLocaleString()}
                                                </small>
                                                {!n.read && <small style={{ color: 'var(--color-primary)' }}>New</small>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowNotifications(false)}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultyDashboard;

