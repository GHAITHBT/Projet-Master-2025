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
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
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
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">Sign in to your university masters application account</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              className={`submit-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? <span className="spinner"></span> : 'Sign In'}
            </button>
          </form>
  
          {/* Add the register link here */}
          <div className="register-link-container">
            <p className="register-link-text">
              Don't have an account?{' '}
              <button className="text-link" onClick={toggleRegister} disabled={isLoading}>
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );}
}

export default Login;