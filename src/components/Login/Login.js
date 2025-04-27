import React, { useState } from 'react';
import axios from 'axios';
import './login.css';
import Register from '../Register/Register';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleRegistrationSuccess = () => {
    setShowRegister(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await axios.post('http://localhost:3001/api/login', { email, password });
      
      setTimeout(() => {
        setIsLoading(false);
        onLogin(response.data.user);
      }, 800);
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.message || 'Échec de la connexion. Veuillez vérifier vos identifiants.');
    }
  };

  const toggleRegister = () => {
    setShowRegister(!showRegister);
  };

  if (showRegister) {
    return (
      <Register
        onRegistrationSuccess={handleRegistrationSuccess}
        onBackToLogin={() => setShowRegister(false)}
      />
    );
  } else {
    return (
      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-card">
            <h2 className="login-title">Bienvenue</h2>
            <p className="login-subtitle">Connectez-vous à votre compte pour les candidatures aux masters universitaires</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Adresse Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Entrez votre email"
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Mot de Passe</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Entrez votre mot de passe"
                  disabled={isLoading}
                />
              </div>
              
              <button
                type="submit"
                className={`submit-btn ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? <span className="spinner"></span> : 'Se Connecter'}
              </button>
            </form>
  
            <div className="register-link-container">
              <p className="register-link-text">
                Vous n'avez pas de compte ?{' '}
                <button className="text-link" onClick={toggleRegister} disabled={isLoading}>
                  S'inscrire
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Login;