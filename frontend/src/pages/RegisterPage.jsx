import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import logo from '../assets/logo.png';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [department, setDepartment] = useState('CSE');
    const [semester, setSemester] = useState(1);
    const [section, setSection] = useState('A');
    const [registerNumber, setRegisterNumber] = useState('');
    const [teacherRoles, setTeacherRoles] = useState([]);
    const [specialization, setSpecialization] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!name || !email || !password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        if (!agreedToTerms) {
            setError('You must agree to the Terms and Conditions');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                name,
                email,
                password,
                role,
                department,
                phoneNumber
            };

            if (role === 'student') {
                payload.semester = semester;
                payload.section = section;
                payload.registerNumber = registerNumber;
            }

            if (role === 'teacher') {
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

            await api.post('/auth/register', payload);
            alert('Registration Successful! Please login.');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'radial-gradient(circle at top right, var(--color-primary-glow), transparent 40%), radial-gradient(circle at bottom left, rgba(0, 255, 255, 0.1), transparent 40%)'
        }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <img src={logo} alt="College Logo" style={{ height: '60px', marginBottom: '15px' }} />
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Create Account</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>Join the scheduling platform</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(255, 0, 0, 0.1)', color: 'var(--color-danger)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Full Name</label>
                        <input
                            className="input-field"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <input
                            type="email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@college.edu"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <input
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Phone Number</label>
                        <input
                            type="tel"
                            className="input-field"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="1234567890"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="input-group">
                            <label className="input-label">Role</label>
                            <select
                                className="input-field"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Department</label>
                            <input
                                className="input-field"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                placeholder="CSE"
                            />
                        </div>
                    </div>

                    {role === 'student' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="input-group">
                                    <label className="input-label">Semester</label>
                                    <select
                                        className="input-field"
                                        value={semester}
                                        onChange={(e) => setSemester(Number(e.target.value))}
                                    >
                                        <option value={1}>1st Year (Semester 1-2)</option>
                                        <option value={2}>2nd Year (Semester 3-4)</option>
                                        <option value={3}>3rd Year (Semester 5-6)</option>
                                        <option value={4}>4th Year (Semester 7-8)</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Section/Class</label>
                                    <input
                                        className="input-field"
                                        value={section}
                                        onChange={(e) => setSection(e.target.value.toUpperCase())}
                                        placeholder="A"
                                        maxLength="1"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Register Number</label>
                                <input
                                    className="input-field"
                                    value={registerNumber}
                                    onChange={(e) => setRegisterNumber(e.target.value)}
                                    placeholder="e.g., 20CS001"
                                />
                            </div>
                        </>
                    )}

                    {role === 'teacher' && (
                        <>
                            <div className="input-group">
                                <label className="input-label">Specialization (e.g., AP,CSE)</label>
                                <input
                                    className="input-field"
                                    value={specialization}
                                    onChange={(e) => setSpecialization(e.target.value)}
                                    placeholder="AP,CSE"
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Teacher Roles</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                    {[
                                        { value: 'subject_teacher', label: 'Subject Teacher' },
                                        { value: 'class_incharge', label: 'Class Incharge' },
                                        { value: 'tutor', label: 'Tutor' },
                                        { value: 'librarian', label: 'Librarian' },
                                        { value: 'seminar_incharge', label: 'Seminar Incharge' }
                                    ].map(roleOption => (
                                        <label key={roleOption.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={teacherRoles.includes(roleOption.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setTeacherRoles([...teacherRoles, roleOption.value]);
                                                    } else {
                                                        setTeacherRoles(teacherRoles.filter(r => r !== roleOption.value));
                                                    }
                                                }}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ color: 'var(--color-text)', fontSize: '0.9rem' }}>{roleOption.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {teacherRoles.some(r => ['class_incharge', 'tutor', 'seminar_incharge'].includes(r)) && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                    <div className="input-group">
                                        <label className="input-label">Assigned Semester</label>
                                        <select
                                            className="input-field"
                                            value={semester}
                                            onChange={(e) => setSemester(Number(e.target.value))}
                                        >
                                            <option value={1}>1st Year</option>
                                            <option value={2}>2nd Year</option>
                                            <option value={3}>3rd Year</option>
                                            <option value={4}>4th Year</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Assigned Section</label>
                                        <input
                                            className="input-field"
                                            value={section}
                                            onChange={(e) => setSection(e.target.value.toUpperCase())}
                                            placeholder="A"
                                            maxLength="1"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            id="terms"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="terms" style={{ color: 'var(--color-text)', fontSize: '0.9rem', cursor: 'pointer' }}>
                            I agree to the <span onClick={() => setShowTerms(true)} style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Terms and Conditions</span>
                        </label>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Login here</Link>
                </div>
            </div>

            {showTerms && (
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
                    <div className="glass-card" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', padding: '30px', position: 'relative', background: '#1e293b', color: 'white' }}>
                        <button onClick={() => setShowTerms(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        <h2 style={{ marginBottom: '20px' }}>Terms and Conditions</h2>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <h3 style={{ marginTop: '10px' }}>Timetable Scheduler Application</h3>
                            <p><strong>Last Updated:</strong> //20__</p>
                            <p>These Terms and Conditions (“Terms”) govern the use of the Timetable Scheduler Application (“Application”, “App”, “Service”) developed and owned by Raguraman J (Owner). By accessing or using this Application, you agree to be bound by these Terms. If you do not agree, please do not use the Application.</p>

                            <h4 style={{ marginTop: '15px' }}>1. Definitions</h4>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li><strong>Application/App:</strong> The Timetable Scheduler software used to create, manage, and optimize academic schedules.</li>
                                <li><strong>User:</strong> Any student, faculty member, administrator, or institution using the Application.</li>
                                <li><strong>Owner:</strong> Raguraman J, the creator and legal owner of the Application.</li>
                                <li><strong>Institution:</strong> Any educational organization using the Application.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>2. Eligibility</h4>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>Users must be authorized by their institution or have valid credentials to access the Application.</li>
                                <li>Minors may use the Application only under institutional supervision.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>3. Purpose of the Application</h4>
                            <p>The Timetable Scheduler App is designed for engineering and higher education institutions to:</p>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>Generate academic timetables</li>
                                <li>Manage working days, periods, breaks, and holidays</li>
                                <li>Reduce manual scheduling errors</li>
                                <li>Improve academic planning efficiency</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>4. User Responsibilities</h4>
                            <p>Users agree to:</p>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>Provide accurate and up-to-date information</li>
                                <li>Use the Application only for academic and institutional purposes</li>
                                <li>Not misuse, reverse engineer, or attempt to disrupt the system</li>
                                <li>Maintain the confidentiality of login credentials</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>5. Data Usage & Privacy</h4>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>The Application may collect academic data such as subjects, faculty details, class schedules, and attendance-related information.</li>
                                <li>User data will be used only for timetable generation and academic operations.</li>
                                <li>The Owner is not responsible for data loss due to system failure, unauthorized access, or third-party services.</li>
                                <li>Institutions are responsible for complying with local data protection laws.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>6. Accuracy of Timetables</h4>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>The Application provides automated timetable generation based on given inputs.</li>
                                <li>While care is taken to optimize schedules, final responsibility for verification lies with the institution.</li>
                                <li>The Owner is not liable for conflicts, overlaps, or errors caused by incorrect inputs.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>7. Intellectual Property</h4>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>All source code, designs, logos, algorithms, and content belong exclusively to Raguraman J (Owner).</li>
                                <li>Users may not copy, distribute, modify, or sell any part of the Application without written permission.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>8. Service Availability</h4>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>The Application is provided on an “as-is” and “as-available” basis.</li>
                                <li>The Owner does not guarantee uninterrupted or error-free service.</li>
                                <li>Maintenance, updates, or downtime may occur without prior notice.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>9. Limitation of Liability</h4>
                            <p>To the maximum extent permitted by law:</p>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>The Owner shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of the Application.</li>
                                <li>This includes loss of data, academic disruptions, or institutional scheduling issues.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>10. Termination of Access</h4>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>The Owner reserves the right to suspend or terminate access if users violate these Terms.</li>
                                <li>Institutions may also request account termination at any time.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>11. Modifications to Terms</h4>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>These Terms may be updated or modified at any time.</li>
                                <li>Continued use of the Application after changes implies acceptance of the revised Terms.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>12. Governing Law</h4>
                            <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                <li>These Terms shall be governed and interpreted in accordance with the laws of India.</li>
                                <li>Any disputes shall be subject to the jurisdiction of Indian courts.</li>
                            </ul>

                            <h4 style={{ marginTop: '15px' }}>13. Contact Information</h4>
                            <p>For questions, feedback, or legal concerns, contact:</p>
                            <p><strong>Owner:</strong> Raguraman J<br /><strong>Role:</strong> Application Owner & Developer</p>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowTerms(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegisterPage;
