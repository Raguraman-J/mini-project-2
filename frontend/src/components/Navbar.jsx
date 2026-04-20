import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import logo from '../assets/logo.png';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <nav className="glass-card" style={{
            margin: '20px',
            padding: '15px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 'var(--radius-lg)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img src={logo} alt="Logo" style={{ height: '40px' }} />
                <div>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Engineering Scheduler</h1>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {user.role} Portal
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <Link to="/profile" style={{ textDecoration: 'none', color: 'white', fontWeight: '500' }}>Profile</Link>
                <span style={{ color: 'var(--color-primary)' }}>Welcome, {user.name}</span>

                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
