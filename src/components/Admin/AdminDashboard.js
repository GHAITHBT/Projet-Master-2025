import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import './AdminDashboard.css';

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min copy.mjs';

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
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    // State for modals
    const [showMastersModal, setShowMastersModal] = useState(false);
    const [selectedUniversity, setSelectedUniversity] = useState(null);
    const [showApplicationsModal, setShowApplicationsModal] = useState(false);
    const [selectedMaster, setSelectedMaster] = useState(null);
    // State for PDF viewer
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [selectedTranscript, setSelectedTranscript] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);

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
                throw new Error('Échec de la récupération des Feedback');
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

    const handleUniversityClick = (uni) => {
        setSelectedUniversity(uni);
        setShowMastersModal(true);
    };

    const handleMasterClick = (master) => {
        setSelectedMaster(master);
        setShowApplicationsModal(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
    };

    const handleViewTranscript = (transcriptPath) => {
        setSelectedTranscript(transcriptPath);
        setShowPdfViewer(true);
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
                                        <div className="university-content">
                                            <div
                                                className="university-clickable"
                                                onClick={() => handleUniversityClick(uni)}
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
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">Aucune université trouvée.</div>
                    )}
                </div>
                <div className="card feedback-card">
                    <h3 className="card-title">Feedback</h3>
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
                        <div className="empty-state">Aucun feedback disponible.</div>
                    )}
                </div>

                {/* Masters Modal */}
                {showMastersModal && selectedUniversity && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Programmes de Master - {selectedUniversity.name}</h3>
                                <button className="close-btn" onClick={() => setShowMastersModal(false)}>
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="modal-body">
                                {selectedUniversity.masters.length > 0 ? (
                                    <div className="master-program-list">
                                        {selectedUniversity.masters.map((master) => (
                                            <div key={master.id} className="master-program-item">
                                                <div
                                                    className="master-program-clickable"
                                                    onClick={() => handleMasterClick(master)}
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
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="empty-state">
                                        Cette université n’a aucun programme de master.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Applications Modal */}
                {showApplicationsModal && selectedMaster && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Candidatures - {selectedMaster.name}</h3>
                                <button className="close-btn" onClick={() => setShowApplicationsModal(false)}>
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="modal-body">
                                {selectedMaster.applications.length > 0 ? (
                                    <div className="applications-container">
                                        {selectedMaster.applications.map((app) => (
                                            <div key={app.id} className="application-item">
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
                                                    {app.transcript_pdf && (
                                                        <div className="application-detail">
                                                            <span className="detail-label">Relevé de Notes:</span>{' '}
                                                            <button
                                                                className="view-transcript-btn"
                                                                onClick={() => handleViewTranscript(app.transcript_pdf)}
                                                            >
                                                                Voir le Relevé de Notes Académique
                                                            </button>
                                                            <a
                                                                href={`http://localhost:3001/${app.transcript_pdf}`}
                                                                download
                                                                className="download-transcript-link"
                                                            >
                                                                Télécharger le PDF
                                                            </a>
                                                        </div>
                                                    )}
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
                        </div>
                    </div>
                )}

                {/* PDF Viewer Modal */}
                {showPdfViewer && selectedTranscript && (
                    <div className="modal-overlay">
                        <div className="pdf-viewer-modal">
                            <div className="modal-header">
                                <h3>Relevé de Notes Académique</h3>
                                <button className="close-btn" onClick={() => setShowPdfViewer(false)}>
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="pdf-viewer">
                                    <Document
                                        file={`http://localhost:3001/${selectedTranscript}`}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        onLoadError={(error) => {
                                            console.error('Erreur lors du chargement du PDF:', error);
                                            setMessage('Erreur lors du chargement du PDF. Veuillez essayer de le télécharger.');
                                        }}
                                    >
                                        <Page pageNumber={pageNumber} width={600} />
                                    </Document>
                                    {numPages && (
                                        <div className="pdf-navigation">
                                            <button
                                                disabled={pageNumber <= 1}
                                                onClick={() => setPageNumber(pageNumber - 1)}
                                                className="pdf-nav-btn"
                                            >
                                                Précédent
                                            </button>
                                            <span>
                                                Page {pageNumber} de {numPages}
                                            </span>
                                            <button
                                                disabled={pageNumber >= numPages}
                                                onClick={() => setPageNumber(pageNumber + 1)}
                                                className="pdf-nav-btn"
                                            >
                                                Suivant
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default SuperAdminDashboard;