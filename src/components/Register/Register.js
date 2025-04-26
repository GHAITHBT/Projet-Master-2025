import React, { useState } from 'react';
import axios from 'axios';
import './Register.css';

function Register({ onRegistrationSuccess, onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [name, setName] = useState(''); // Added name state
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [specialities] = useState([
    'Computer Science', 
    'Information Technology', 
    'Data Science', 
    'Artificial Intelligence', 
    'Software Engineering',
    'Cybersecurity',
    'Electronics',
    'Mechanical Engineering',
    'Civil Engineering',
    'Business Administration'
  ]);

  const validateForm = () => {
    if (!email || !password || !confirmPassword || !speciality || !name) { // Added name to validation
      setError('All fields are required');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:3001/api/register', { 
        email, 
        password, 
        speciality,
        name // Added name to the request payload
      });
      
      setMessage(response.data.message || 'Registration successful!');
      
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setSpeciality('');
      setName(''); // Reset name field
      
      setTimeout(() => {
        onRegistrationSuccess();
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.message || 
        'Registration failed. Please make sure the backend server is running and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialityChange = (e) => {
    setSpeciality(e.target.value);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2 className="register-title">Create Account</h2>
          <p className="register-subtitle">Join our university masters application platform</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label> {/* Added name field */}
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="speciality">Your Speciality</label>
            <select
              id="speciality"
              value={speciality}
              onChange={handleSpecialityChange}
              disabled={loading}
              required
            >
              <option value="">Select your speciality</option>
              {specialities.map((spec, index) => (
                <option key={index} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
          
          <button
            type="button"
            onClick={onBackToLogin}
            className="btn btn-secondary"
            disabled={loading}
          >
            Back to Login
          </button>
        </form>
        
        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <button className="text-link" onClick={onBackToLogin}>
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;