import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentChat from './pages/StudentChat';
import ProfilePage from './pages/ProfilePage';

import { useContext } from 'react';
import AuthContext from './context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />; // Redirect to home or unauthorized page
  }

  return children;
};

const RoleRedirect = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'teacher') return <Navigate to="/faculty" />;
  return <Navigate to="/student" />;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />


        <Route path="/profile" element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        } />


        <Route path="/admin" element={
          <PrivateRoute roles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        } />

        <Route path="/faculty" element={
          <PrivateRoute roles={['teacher']}>
            <FacultyDashboard />
          </PrivateRoute>
        } />

        <Route path="/student" element={
          <PrivateRoute roles={['student']}>
            <StudentDashboard />
          </PrivateRoute>
        } />

        <Route path="/student/chat" element={
          <PrivateRoute roles={['student']}>
            <StudentChat />
          </PrivateRoute>
        } />

        <Route path="/dashboard" element={<RoleRedirect />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
