import React, { useState, useEffect } from 'react';
import './App.css';
import Register from './components/Register/Register';
import Login from './components/Login/Login';
import StudentDashboard from './components/Student/StudentDashboard';
import UniversityDashboard from './components/University/UniversityDashboard';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const handleRegistrationSuccess = () => {
    setShowRegister(false);
  };

  const toggleRegister = () => {
    setShowRegister(!showRegister);
  };

  const renderContent = () => {
    if (!user) {
      if (showRegister) {
        return (
          <Register
            onRegistrationSuccess={handleRegistrationSuccess}
            onBackToLogin={() => setShowRegister(false)}
          />
        );
      } else {
        return (
          <>
            <Login onLogin={handleLogin} />
            <div className="register-link-container">
              <p className="register-link-text">
                Don't have an account?{' '}
                <button className="text-link" onClick={toggleRegister}>
                  Register
                </button>
              </p>
            </div>
          </>
        );
      }
    }

    switch (user.role) {
      case 'student':
        return <StudentDashboard user={user} onLogout={handleLogout} />;
      case 'university':
        return <UniversityDashboard user={user} onLogout={handleLogout} />;
      case 'super_admin':
        return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
      default:
        return (
          <div className="unknown-role-wrapper">
            <div className="card">
              <h3>Unknown User Role</h3>
              <p>Your account type is not recognized by the system.</p>
              <button
                onClick={handleLogout}
                className="logout-btn"
              >
                Logout
              </button>
            </div>
          </div>
        );
    }
  };

  return <div className="app-wrapper">{renderContent()}</div>;
}

export default App;