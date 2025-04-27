import React, { useState } from 'react';
import axios from 'axios';
import './Register.css';

function Register({ onRegistrationSuccess, onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [specialities] = useState([
    'Informatique',
    'Technologies de l’Information',
    'Science des Données',
    'Intelligence Artificielle',
    'Ingénierie Logicielle',
    'Cybersécurité',
    'Électronique',
    'Ingénierie Mécanique',
    'Ingénierie Civile',
    'Administration des Affaires'
  ]);

  const validateForm = () => {
    if (!email || !password || !confirmPassword || !speciality || !name) {
      setError('Tous les champs sont requis');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Veuillez entrer une adresse email valide');
      return false;
    }
    
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
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
        name
      });
      
      setMessage(response.data.message || 'Inscription réussie !');
      
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setSpeciality('');
      setName('');
      
      setTimeout(() => {
        onRegistrationSuccess();
      }, 1500);
    } catch (err) {
      console.error('Erreur d’inscription:', err);
      setError(
        err.response?.data?.message || 
        'Échec de l’inscription. Assurez-vous que le serveur backend est en cours d’exécution et réessayez.'
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
          <h2 className="register-title">Créer un Compte</h2>
          <p className="register-subtitle">Rejoignez notre plateforme de candidatures aux masters universitaires</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Nom Complet</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Entrez votre nom complet"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Adresse Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Entrez votre email"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Mot de Passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Créez un mot de passe"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le Mot de Passe</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="speciality">Votre Spécialité</label>
            <select
              id="speciality"
              value={speciality}
              onChange={handleSpecialityChange}
              disabled={loading}
              required
            >
              <option value="">Sélectionnez votre spécialité</option>
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
            {loading ? 'Inscription en cours...' : 'S’inscrire'}
          </button>
          
          <button
            type="button"
            onClick={onBackToLogin}
            className="btn btn-secondary"
            disabled={loading}
          >
            Retour à la Connexion
          </button>
        </form>
        
        <div className="register-footer">
          <p>
            Vous avez déjà un compte ?{' '}
            <button className="text-link" onClick={onBackToLogin}>
              Se Connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;