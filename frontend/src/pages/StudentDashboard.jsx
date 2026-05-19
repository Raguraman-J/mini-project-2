import { useState, useEffect, useContext } from 'react';
import Navbar from '../components/Navbar';
import AuthContext from '../context/AuthContext';
import TimetableGrid from '../components/TimetableGrid';
import api from '../utils/api';

const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchedule = async () => {
            const dept = user?.department || 'CSE';
            const sem = user?.semester || 1;
            const sec = user?.section || 'A';

            try {
                const res = await api.get('/scheduler', { params: { department: dept, semester: sem, section: sec } });
                if (res.data) setTimetable(res.data);
            } catch (error) {
                console.error(error);
            }
            setLoading(false);
        };

        if (user) {
            fetchSchedule();
        }
    }, [user]);

    return (
        <div>
            <Navbar />
            <div className="container">
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h2>Student Dashboard</h2>
                    <p>Welcome, {user?.name}!</p>
                    {user?.registerNumber && (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                            Register Number: {user.registerNumber}
                        </p>
                    )}
                </div>

                {/* AI Assistant Banner */}
                <div
                    onClick={() => window.location.href = '/student/chat'}
                    className="glass-card animate-fade-in"
                    style={{
                        marginBottom: '20px',
                        padding: '20px',
                        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(0, 0, 0, 0))',
                        border: '1px solid rgba(124, 58, 237, 0.3)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div>
                        <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>🤖</span> Personal AI Assistant
                        </h3>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                            Need help? Ask me anything about your schedule or studies.
                        </p>
                    </div>
                    <div style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>➔</div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h2>My Timetable <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                        ({user?.department || 'N/A'} - Year {user?.semester || 'N/A'} - Sec {user?.section || 'N/A'})
                    </span></h2>
                </div>

                {loading ? (
                    <div className="card">Loading...</div>
                ) : (
                    <>
                        {timetable.length > 0 ? (
                            <TimetableGrid timetable={timetable} />
                        ) : (
                            <div className="card">No timetable found for your class.</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;

