import React, { useState, useEffect } from 'react';
import './App.css';
import Register from './components/Register/Register';
import Login from './components/Login/Login';
import StudentDashboard from './components/Student/StudentDashboard';
import UniversityDashboard from './components/University/UniversityDashboard';
import SuperAdminDashboard from './components/Admin/AdminDashboard';

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
                Vous n'avez pas de compte ?{' '}
                <button className="text-link" onClick={toggleRegister}>
                  S'inscrire
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
              <h3>Rôle d'Utilisateur Inconnu</h3>
              <p>Votre type de compte n'est pas reconnu par le système.</p>
              <button
                onClick={handleLogout}
                className="logout-btn"
              >
                Déconnexion
              </button>
            </div>
          </div>
        );
    }
  };

  return <div className="app-wrapper">{renderContent()}</div>;
}

export default App;