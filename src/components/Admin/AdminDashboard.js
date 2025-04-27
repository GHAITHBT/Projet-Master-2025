import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

function SuperAdminDashboard({ user, onLogout }) {
    const [universities, setUniversities] = useState([]);
    const [newUniName, setNewUniName] = useState('');
    const [newUniEmail, setNewUniEmail] = useState('');
    const [newUniPassword, setNewUniPassword] = useState('');
    const [editUniId, setEditUniId] = useState(null);
    const [editUniName, setEditUniName] = useState('');
    const [editUniEmail, setEditUniEmail] = useState('');
    const [editUniPassword, setEditUniPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showUserInfo, setShowUserInfo] = useState(false);
    const [expandedUni, setExpandedUni] = useState(null);
    const [expandedMaster, setExpandedMaster] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    const [stats, setStats] = useState({
        totalUniversities: 0,
        totalMasters: 0,
        totalApplications: 0,
        pendingApplications: 0
    });

    useEffect(() => {
        if (user.role !== 'super_admin') {
            setMessage('Accès refusé. Privilèges de super administrateur requis.');
            setLoading(false);
            return;
        }
        fetchUniversities();
        fetchFeedbacks();
    }, [user]);

    const fetchUniversities = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch('http://localhost:3001/api/superadmin/universities', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Échec de la récupération des universités');
            }
            
            const data = await response.json();
            setUniversities(data.universities);
            
            let masterCount = 0;
            let appCount = 0;
            let pendingCount = 0;
            
            data.universities.forEach(uni => {
                masterCount += uni.masters.length;
                uni.masters.forEach(master => {
                    appCount += master.applications.length;
                    pendingCount += master.applications.filter(app => app.status === 'pending').length;
                });
            });
            
            setStats({
                totalUniversities: data.universities.length,
                totalMasters: masterCount,
                totalApplications: appCount,
                pendingApplications: pendingCount
            });
            
            setLoading(false);
        } catch (err) {
            console.error('Erreur lors de la récupération des universités:', err);
            setMessage('Erreur lors de la récupération des universités. Veuillez réessayer plus tard.');
            setLoading(false);
        }
    };

    const fetchFeedbacks = async () => {
        setFeedbackLoading(true);
        setMessage('');
        try {
            const response = await fetch('http://localhost:3001/api/superadmin/feedback', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Échec de la récupération des retours');
            }

            const data = await response.json();
            setFeedbacks(data.feedbacks);
            setFeedbackLoading(false);
        } catch (err) {
            console.error('Erreur lors de la récupération des retours:', err);
            setMessage('Erreur lors de la récupération des retours. Veuillez réessayer plus tard.');
            setFeedbackLoading(false);
        }
    };

    const handleAddUniversity = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!newUniName.trim() || !newUniEmail.trim() || !newUniPassword.trim()) {
            setMessage('Veuillez fournir le nom, l’email et le mot de passe de l’université.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/superadmin/universities', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newUniName,
                    email: newUniEmail,
                    password: newUniPassword
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Échec de l’ajout de l’université');
            }
            
            setMessage(data.message || 'Université ajoutée avec succès !');
            setNewUniName('');
            setNewUniEmail('');
            setNewUniPassword('');
            fetchUniversities();
        } catch (err) {
            console.error('Erreur lors de l’ajout de l’université:', err);
            setMessage(err.message || 'Erreur lors de l’ajout de l’université. Veuillez réessayer.');
        }
    };

    const handleEditUniversity = (uni) => {
        setEditUniId(uni.id);
        setEditUniName(uni.name);
        setEditUniEmail(uni.email);
        setEditUniPassword('');
    };

    const handleUpdateUniversity = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!editUniName.trim() || !editUniEmail.trim()) {
            setMessage('Veuillez fournir le nom et l’email de l’université.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3001/api/superadmin/universities/${editUniId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: editUniName,
                    email: editUniEmail,
                    password: editUniPassword || undefined
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Échec de la mise à jour de l’université');
            }
            
            setMessage(data.message || 'Université mise à jour avec succès !');
            setEditUniId(null);
            setEditUniName('');
            setEditUniEmail('');
            setEditUniPassword('');
            fetchUniversities();
        } catch (err) {
            console.error('Erreur lors de la mise à jour de l’université:', err);
            setMessage(err.message || 'Erreur lors de la mise à jour de l’université. Veuillez réessayer.');
        }
    };

    const handleDeleteUniversity = async (uniId) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette université et tous ses programmes de master ?')) {
            try {
                const response = await fetch(`http://localhost:3001/api/superadmin/universities/${uniId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Échec de la suppression de l’université');
                }
                
                setMessage('Université supprimée avec succès !');
                fetchUniversities();
            } catch (err) {
                console.error('Erreur lors de la suppression de l’université:', err);
                setMessage(err.message || 'Erreur lors de la suppression de l’université. Veuillez réessayer.');
            }
        }
    };

    const toggleUserInfo = () => {
        setShowUserInfo(!showUserInfo);
    };

    const toggleUniversity = (uniId) => {
        setExpandedUni(expandedUni === uniId ? null : uniId);
        setExpandedMaster(null);
    };

    const toggleMaster = (masterId) => {
        setExpandedMaster(expandedMaster === masterId ? null : masterId);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    return (
        <div className="combined-dashboard">
            <header className="dashboard-header">
                <div className="header-container">
                    <div>
                        <h1 className="dashboard-title">Université Jendouba</h1>
                        <p className="dashboard-subtitle">Système de Gestion Universitaire</p>
                    </div>
                    <div className="user-info">
                        <div className="user-profile" onClick={toggleUserInfo}>
                            <div className="avatar">{user.name?.charAt(0) || 'A'}</div>
                            <span className="user-greeting">Bienvenue, {user.name || 'Super Admin'}</span>
                        </div>
                        {showUserInfo && (
                            <div className="user-info-dropdown">
                                <div className="user-details">
                                    <p><span>Nom:</span> <span>{user.name}</span></p>
                                    <p><span>Email:</span> <span>{user.email}</span></p>
                                    <p><span>Rôle:</span> <span>Super Administrateur</span></p>
                                </div>
                                <button onClick={onLogout} className="btn btn-danger">
                                    Déconnexion
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="main-content">
                {message && (
                    <div className="alert alert-info">{message}</div>
                )}
                
                <div className="dashboard-statistics">
                    <div className="card stat-cards-container">
                        <h2 className="card-title">Aperçu du Tableau de Bord</h2>
                        <div className="dashboard-overview">
                            <div className="stat-card blue-stat">
                                <h3 className="stat-card-title">Universités</h3>
                                <p className="stat-card-value">{stats.totalUniversities}</p>
                            </div>
                            <div className="stat-card green-stat">
                                <h3 className="stat-card-title">Programmes de Master</h3>
                                <p className="stat-card-value">{stats.totalMasters}</p>
                            </div>
                            <div className="stat-card yellow-stat">
                                <h3 className="stat-card-title">Total des Candidatures</h3>
                                <p className="stat-card-value">{stats.totalApplications}</p>
                            </div>
                            <div className="stat-card red-stat">
                                <h3 className="stat-card-title">Candidatures en Attente</h3>
                                <p className="stat-card-value">{stats.pendingApplications}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card add-university-card">
                    <h3 className="card-title">Ajouter une Nouvelle Université</h3>
                    <form onSubmit={handleAddUniversity} className="add-university-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nom de l'Université</label>
                                <input
                                    type="text"
                                    value={newUniName}
                                    onChange={(e) => setNewUniName(e.target.value)}
                                    required
                                    placeholder="ex. Université de Technologie"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email de l'Université</label>
                                <input
                                    type="email"
                                    value={newUniEmail}
                                    onChange={(e) => setNewUniEmail(e.target.value)}
                                    required
                                    placeholder="ex. admin@techuni.edu"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mot de Passe</label>
                                <input
                                    type="password"
                                    value={newUniPassword}
                                    onChange={(e) => setNewUniPassword(e.target.value)}
                                    required
                                    placeholder="Entrez le mot de passe"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-button-group">
                                <button type="submit" className="btn btn-success">
                                    Ajouter l'Université
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="card universities-card">
                    <h3 className="card-title">Universités et Programmes de Master</h3>
                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                        </div>
                    ) : universities.length > 0 ? (
                        <div className="university-list">
                            {universities.map((uni) => (
                                <div key={uni.id} className="university-item">
                                    {editUniId === uni.id ? (
                                        <form onSubmit={handleUpdateUniversity} className="edit-university-form">
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label">Nom de l'Université</label>
                                                    <input
                                                        type="text"
                                                        value={editUniName}
                                                        onChange={(e) => setEditUniName(e.target.value)}
                                                        required
                                                        className="form-input"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Email de l'Université</label>
                                                    <input
                                                        type="email"
                                                        value={editUniEmail}
                                                        onChange={(e) => setEditUniEmail(e.target.value)}
                                                        required
                                                        className="form-input"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Nouveau Mot de Passe (facultatif)</label>
                                                    <input
                                                        type="password"
                                                        value={editUniPassword}
                                                        onChange={(e) => setEditUniPassword(e.target.value)}
                                                        placeholder="Entrez un nouveau mot de passe"
                                                        className="form-input"
                                                    />
                                                </div>
                                                <div className="form-button-group">
                                                    <button type="submit" className="btn btn-success btn-sm">Enregistrer</button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditUniId(null)}
                                                        className="btn btn-secondary btn-sm"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="university-header">
                                                <div
                                                    className="university-info"
                                                    onClick={() => toggleUniversity(uni.id)}
                                                >
                                                    <span className="university-title">{uni.name}</span>
                                                    <span className="university-email">({uni.email})</span>
                                                </div>
                                                <div className="university-actions">
                                                    <button
                                                        onClick={() => handleEditUniversity(uni)}
                                                        className="btn btn-primary btn-sm"
                                                    >
                                                        Modifier
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUniversity(uni.id)}
                                                        className="btn btn-danger btn-sm"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </div>
                                            {expandedUni === uni.id && (
                                                <div className="master-program-list">
                                                    {uni.masters.length > 0 ? (
                                                        <div>
                                                            {uni.masters.map((master) => (
                                                                <div key={master.id} className="master-program-item">
                                                                    <div
                                                                        className="master-program-header"
                                                                        onClick={() => toggleMaster(master.id)}
                                                                    >
                                                                        <h4 className="master-name">{master.name}</h4>
                                                                        <p className="master-description">{master.description}</p>
                                                                        <div className="master-details">
                                                                            <p>Requis: <span className="highlight">{master.required_speciality}</span></p>
                                                                            <p>Étudiants Max: <span className="highlight">{master.max_students}</span></p>
                                                                            <p>Candidatures: <span className="highlight">{master.application_count || 0}</span></p>
                                                                            <p>
                                                                                Période de Candidature:{' '}
                                                                                <span className="highlight">
                                                                                    {formatDate(master.application_start_date)} - {formatDate(master.application_end_date)}
                                                                                </span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {expandedMaster === master.id && (
                                                                        <div className="application-list">
                                                                            <h5 className="applications-heading">Candidatures</h5>
                                                                            {master.applications.length > 0 ? (
                                                                                <div className="applications-container">
                                                                                    {master.applications.map((app) => (
                                                                                        <div
                                                                                            key={app.id}
                                                                                            className="application-item"
                                                                                        >
                                                                                            <div className="application-grid">
                                                                                                <div className="application-detail">
                                                                                                    <span className="detail-label">Étudiant:</span>{' '}
                                                                                                    <span className="detail-value">
                                                                                                        {app.student_email} ({app.student_speciality})
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="application-detail">
                                                                                                    <span className="detail-label">Score:</span>{' '}
                                                                                                    <span className="detail-value">
                                                                                                        {app.calculated_score || 'N/A'}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="application-detail">
                                                                                                    <span className="detail-label">Statut:</span>{' '}
                                                                                                    <span className={`status-badge status-${app.status}`}>
                                                                                                        {app.status === 'pending' ? 'En Attente' : app.status === 'accepted' ? 'Accepté' : 'Rejeté'}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="application-detail">
                                                                                                    <span className="detail-label">Notes:</span>{' '}
                                                                                                    <span className="detail-value">
                                                                                                        1re: {app.first_year_mark || 'N/A'}, 
                                                                                                        2e: {app.second_year_mark || 'N/A'}, 
                                                                                                        3e: {app.third_year_mark || 'N/A'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <p className="empty-state">
                                                                                    Aucune candidature pour ce programme de master.
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="empty-state">
                                                            Cette université n’a aucun programme de master.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">Aucune université trouvée.</div>
                    )}
                </div>
                <div className="card feedback-card">
                    <h3 className="card-title">Retour des Utilisateurs</h3>
                    {feedbackLoading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                        </div>
                    ) : feedbacks.length > 0 ? (
                        <div className="feedback-list">
                            {feedbacks.map((feedback) => (
                                <div key={feedback.id} className="feedback-item">
                                    <div className="feedback-header">
                                        <h4 className="feedback-subject">{feedback.subject}</h4>
                                        <div className="feedback-meta">
                                            <span className="feedback-user">Par: {feedback.user_name || 'Anonyme'}</span>
                                            <span className="feedback-date">{formatDate(feedback.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="feedback-content">
                                        <p className="feedback-message">{feedback.message}</p>
                                        <div className="feedback-rating">
                                            Évaluation: {'★'.repeat(feedback.rating)}{'☆'.repeat(5 - feedback.rating)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">Aucun retour disponible.</div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default SuperAdminDashboard;