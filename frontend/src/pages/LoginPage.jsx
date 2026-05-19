import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import AuthContext from '../context/AuthContext';
import logo from '../assets/logo.png';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        const result = await login(email, password);

        if (result.success) {
            // Redirect based on role logic will be handled in protected route or here
            // Getting user again from context might be async, so we use the result or simple redirect to dashboard
            // Let's assume dashboard handles role based view or we redirect to different paths
            // For now, redirect to /dashboard
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'radial-gradient(circle at top right, var(--color-primary-glow), transparent 40%), radial-gradient(circle at bottom left, rgba(0, 255, 255, 0.1), transparent 40%)'
        }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <img src={logo} alt="College Logo" style={{ height: '80px', marginBottom: '20px' }} />
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Welcome Back</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>Sign in to access your timetable</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(255, 0, 0, 0.1)', color: 'var(--color-danger)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <input
                            type="email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@hit.edu.in"
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
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                        Sign In
                    </button>


                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                    Don't have an account? <Link to="/register" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Register here</Link>
                </div>
            </div>

        </div>
    );
};

export default LoginPage;
