import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';

const ProfilePage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [department, setDepartment] = useState(user?.department || 'CSE');
    const [semester, setSemester] = useState(user?.semester || user?.assignedClass?.semester || 1);
    const [section, setSection] = useState(user?.section || user?.assignedClass?.section || 'A');
    const [registerNumber, setRegisterNumber] = useState(user?.registerNumber || '');
    const [teacherRoles, setTeacherRoles] = useState(user?.teacherRoles || []);
    const [specialization, setSpecialization] = useState(user?.specialization || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg('');
        setError('');

        if (password && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const payload = {
                name,
                email,
                password: password || undefined,
                department,
                phoneNumber,
            };

            if (user?.role === 'student') {
                payload.semester = semester;
                payload.section = section;
                payload.registerNumber = registerNumber;
            }

            if (user?.role === 'teacher') {
                payload.teacherRoles = teacherRoles;
                payload.specialization = specialization;
                const needsClass = teacherRoles.some(r => ['class_incharge', 'tutor', 'seminar_incharge'].includes(r));
                if (needsClass) {
                    payload.assignedClass = {
                        semester: Number(semester),
                        section: section
                    };
                }
            }

            const res = await api.put('/auth/profile', payload);
            setMsg('Profile Updated Successfully');
            localStorage.setItem('user', JSON.stringify(res.data));
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Update failed');
        }
    };

    const getRoleColor = () => {
        switch (user?.role) {
            case 'admin': return 'var(--color-secondary)';
            case 'teacher': return '#f59e0b';
            case 'student': return 'var(--color-primary)';
            default: return 'gray';
        }
    };

    return (
        <div>
            <Navbar />
            <div className="container">
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div className="card" style={{ textAlign: 'center', borderTop: `5px solid ${getRoleColor()}` }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            backgroundColor: getRoleColor(), color: 'white',
                            fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px auto'
                        }}>
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <h2>{user?.name}</h2>
                        <span style={{
                            backgroundColor: getRoleColor(),
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase'
                        }}>
                            {user?.role}
                        </span>

                        <div style={{ marginTop: '20px', textAlign: 'left', backgroundColor: 'var(--color-background)', padding: '15px', borderRadius: '8px' }}>
                            <p><strong>Department:</strong> {user?.department || 'N/A'}</p>
                            <p><strong>Phone:</strong> {user?.phoneNumber || 'N/A'}</p>
                            <p><strong>Email:</strong> {user?.email}</p>
                            {user?.role === 'student' && (
                                <>
                                    <p><strong>Semester/Year:</strong> {user?.semester || 'N/A'}</p>
                                    <p><strong>Section:</strong> {user?.section || 'N/A'}</p>
                                    <p><strong>Register Number:</strong> {user?.registerNumber || 'N/A'}</p>
                                </>
                            )}
                            {user?.role === 'teacher' && (
                                <>
                                    <p><strong>Specialization:</strong> {user?.specialization || 'N/A'}</p>
                                    <p><strong>Roles:</strong> {user?.teacherRoles?.join(', ') || 'N/A'}</p>
                                    {user?.assignedClass?.semester && (
                                        <p><strong>Assigned Class:</strong> Year {user.assignedClass.semester} - Sec {user.assignedClass.section}</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="glass-card" style={{ marginTop: '20px', padding: '30px' }}>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="btn"
                            style={{
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>←</span> Go Back
                        </button>
                        <h3>Edit Profile</h3>

                        {msg && <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '4px', marginBottom: '15px' }}>{msg}</div>}
                        {error && <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label className="input-label">Full Name</label>
                                <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Email Address</label>
                                <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Department</label>
                                <input className="input-field" value={department} onChange={(e) => setDepartment(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Phone Number</label>
                                <input className="input-field" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                            </div>

                            {user?.role === 'student' && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="input-group">
                                            <label className="input-label">Semester/Year</label>
                                            <select className="input-field" value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
                                                <option value={1}>1st Year</option>
                                                <option value={2}>2nd Year</option>
                                                <option value={3}>3rd Year</option>
                                                <option value={4}>4th Year</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Section</label>
                                            <input className="input-field" value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} maxLength="1" />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Register Number</label>
                                        <input className="input-field" value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} />
                                    </div>
                                </>
                            )}

                            {user?.role === 'teacher' && (
                                <>
                                    <div className="input-group">
                                        <label className="input-label">Specialization</label>
                                        <input className="input-field" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Teacher Roles</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                            {['subject_teacher', 'class_incharge', 'tutor', 'librarian', 'seminar_incharge'].map(role => (
                                                <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={teacherRoles.includes(role)}
                                                        onChange={(e) => e.target.checked ? setTeacherRoles([...teacherRoles, role]) : setTeacherRoles(teacherRoles.filter(r => r !== role))}
                                                    />
                                                    <span style={{ fontSize: '0.9rem' }}>{role.replace('_', ' ')}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    {teacherRoles.some(r => ['class_incharge', 'tutor', 'seminar_incharge'].includes(r)) && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                                            <div className="input-group">
                                                <label className="input-label">Assigned Semester</label>
                                                <select className="input-field" value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
                                                    <option value={1}>1st Year</option>
                                                    <option value={2}>2nd Year</option>
                                                    <option value={3}>3rd Year</option>
                                                    <option value={4}>4th Year</option>
                                                </select>
                                            </div>
                                            <div className="input-group">
                                                <label className="input-label">Assigned Section</label>
                                                <input className="input-field" value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} maxLength="1" />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="input-group">
                                <label className="input-label">New Password</label>
                                <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Confirm Password</label>
                                <input type="password" className="input-field" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Changes</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
