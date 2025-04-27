import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import './UniversityDashboard.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min copy.mjs';

function CombinedDashboard({ user, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSpecialities, setSelectedSpecialities] = useState([]);
  const [maxStudents, setMaxStudents] = useState('');
  const [applicationStartDate, setApplicationStartDate] = useState('');
  const [applicationEndDate, setApplicationEndDate] = useState('');
  const [masters, setMasters] = useState([]);
  const [showUserInfo, setShowUserInfo] = useState(false);
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
  const [activeTab, setActiveTab] = useState('applications');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'programs') {
      fetchUniversityMasters();
    }
  }, [activeTab]);

  const fetchApplications = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.get('http://localhost:3001/api/admin/applications');
      setApplications(response.data.applications);
      setIsLoading(false);
    } catch (err) {
      console.error('Erreur lors de la récupération des candidatures:', err);
      setMessage('Erreur lors de la récupération des candidatures.');
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId, status) => {
    setMessage('');
    try {
      const response = await axios.put(`http://localhost:3001/api/admin/applications/${applicationId}/status`, { status });
      setMessage(response.data.message);
      fetchApplications();
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setMessage(err.response?.data?.message || 'Erreur lors de la mise à jour du statut.');
    }
  };

  const getFilteredApplications = () => {
    if (filter === 'all') {
      return applications;
    }
    return applications.filter(app => app.status === filter);
  };

  const getSortedApplications = () => {
    const filtered = getFilteredApplications();
    if (sortBy === 'score') {
      return [...filtered].sort((a, b) => b.calculated_score - a.calculated_score);
    } else if (sortBy === 'speciality') {
      return [...filtered].sort((a, b) => a.student_speciality.localeCompare(b.student_speciality));
    } else {
      return [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  };

  const viewApplicationDetails = (application) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'accepted': return 'status-badge status-accepted';
      case 'rejected': return 'status-badge status-rejected';
      default: return 'status-badge status-pending';
    }
  };

  const fetchUniversityMasters = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post('http://localhost:3001/api/masters');
      const universitySpecificMasters = response.data.masters.filter(m => m.university_id === user.id);
      setMasters(universitySpecificMasters);
      setIsLoading(false);
    } catch (err) {
      console.error('Erreur lors de la récupération des masters:', err);
      setMessage('Erreur lors de la récupération de vos masters. Veuillez réessayer plus tard.');
      setIsLoading(false);
    }
  };

  const handleAddMaster = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!name.trim() || !description.trim() || !selectedSpecialities.length || !maxStudents || !applicationStartDate || !applicationEndDate) {
      setMessage('Veuillez remplir tous les champs requis, y compris au moins une spécialité.');
      return;
    }

    if (new Date(applicationEndDate) <= new Date(applicationStartDate)) {
      setMessage('La date de fin de candidature doit être postérieure à la date de début.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3001/api/university/masters', {
        universityId: user.id,
        name,
        description,
        specialities: selectedSpecialities,
        maxStudents: parseInt(maxStudents),
        applicationStartDate,
        applicationEndDate
      });
      setMessage(response.data.message || 'Programme de master ajouté avec succès !');
      setName('');
      setDescription('');
      setSelectedSpecialities([]);
      setMaxStudents('');
      setApplicationStartDate('');
      setApplicationEndDate('');
      fetchUniversityMasters();
    } catch (err) {
      console.error('Erreur lors de l’ajout du master:', err);
      setMessage(err.response?.data?.message || 'Erreur lors de l’ajout du master. Veuillez réessayer.');
    }
  };

  const handleDeleteMaster = async (masterId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce programme de master ?')) {
      try {
        await axios.delete(`http://localhost:3001/api/university/masters/${masterId}`);
        setMessage('Programme de master supprimé avec succès !');
        fetchUniversityMasters();
      } catch (err) {
        console.error('Erreur lors de la suppression du master:', err);
        setMessage('Erreur lors de la suppression du programme de master. Veuillez réessayer.');
      }
    }
  };

  const toggleUserInfo = () => {
    setShowUserInfo(!showUserInfo);
  };

  const handleSpecialityChange = (speciality) => {
    setSelectedSpecialities(prev =>
      prev.includes(speciality)
        ? prev.filter(s => s !== speciality)
        : [...prev, speciality]
    );
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  return (
    <div className="combined-dashboard">
      <header className="dashboard-header">
        <div className="header-container">
          <div>
            <h1 className="dashboard-title">Système de Gestion Universitaire</h1>
            <p className="dashboard-subtitle">Portail d'Administration</p>
          </div>
          <div className="user-info">
            <div className="user-profile" onClick={toggleUserInfo}>
              <div className="avatar">{user?.name?.charAt(0) || 'A'}</div>
              <span className="user-greeting">Bienvenue, {user?.name || 'Admin'}</span>
            </div>
            {showUserInfo && (
              <div className="user-info-dropdown">
                <div className="user-details">
                  <p><span>Nom:</span> <span>{user?.name || 'Admin'}</span></p>
                  <p><span>Email:</span> <span>{user?.email || 'admin@example.com'}</span></p>
                  <p><span>Rôle:</span> <span>Administrateur d'Université</span></p>
                </div>
                <button 
                  onClick={onLogout} 
                  className="btn btn-danger"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            Candidatures des Étudiants
          </button>
          <button 
            className={`tab-button ${activeTab === 'programs' ? 'active' : ''}`}
            onClick={() => setActiveTab('programs')}
          >
            Programmes de Master
          </button>
        </div>

        {message && (
          <div className="alert alert-info">
            {message}
          </div>
        )}

        {activeTab === 'applications' && (
          <>
            <div className="card">
              <h2 className="card-title">Aperçu du Tableau de Bord</h2>
              <div className="dashboard-overview">
                <div className="stat-card blue-stat">
                  <h3 className="stat-card-title">Total des Candidatures</h3>
                  <p className="stat-card-value">{applications.length}</p>
                </div>
                <div className="stat-card yellow-stat">
                  <h3 className="stat-card-title">En Attente</h3>
                  <p className="stat-card-value">{applications.filter(a => a.status === 'pending').length}</p>
                </div>
                <div className="stat-card green-stat">
                  <h3 className="stat-card-title">Accepté</h3>
                  <p className="stat-card-value">{applications.filter(a => a.status === 'accepted').length}</p>
                </div>
                <div className="stat-card red-stat">
                  <h3 className="stat-card-title">Rejeté</h3>
                  <p className="stat-card-value">{applications.filter(a => a.status === 'rejected').length}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="controls-container">
                <h2 className="card-title">Candidatures des Étudiants</h2>
                <div className="filter-controls">
                  <div className="form-group">
                    <label htmlFor="filter" className="form-label">Filtrer par Statut</label>
                    <select 
                      id="filter"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="form-select"
                    >
                      <option value="all">Toutes les Candidatures</option>
                      <option value="pending">En Attente</option>
                      <option value="accepted">Accepté</option>
                      <option value="rejected">Rejeté</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="sort" className="form-label">Trier par</label>
                    <select 
                      id="sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="form-select"
                    >
                      <option value="score">Score (le plus élevé en premier)</option>
                      <option value="speciality">Spécialité</option>
                      <option value="date">Date de Candidature</option>
                    </select>
                  </div>
                  <div className="form-group" style={{justifyContent: 'flex-end'}}>
                    <button 
                      onClick={fetchApplications} 
                      className="btn btn-primary"
                    >
                      Actualiser les Données
                    </button>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                </div>
              ) : getSortedApplications().length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Étudiant</th>
                        <th>Spécialité</th>
                        <th>Score</th>
                        <th>Programme de Master</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedApplications().map((app) => (
                        <tr key={app.id}>
                          <td>
                            <div className="student-email">{app.student_email}</div>
                          </td>
                          <td>
                            <div>{app.student_speciality}</div>
                          </td>
                          <td>
                            <div>{app.calculated_score}</div>
                            <div className="text-secondary">1re Année: {app.first_year_mark} | 2e Année: {app.second_year_mark} | 3e Année: {app.third_year_mark}</div>
                          </td>
                          <td>
                            <div>{app.master_name}</div>
                            <div className="text-secondary">
                              Spécialités Requises: {app.master_specialities?.length > 0 ? app.master_specialities.join(', ') : 'Plusieurs Spécialités'}
                            </div>
                          </td>
                          <td>
                            <span className={getStatusClass(app.status)}>
                              {app.status === 'pending' ? 'En Attente' : app.status === 'accepted' ? 'Accepté' : 'Rejeté'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => viewApplicationDetails(app)}
                                className="btn btn-primary btn-sm"
                              >
                                Voir
                              </button>
                              {app.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleStatusUpdate(app.id, 'accepted')}
                                    className="btn btn-success btn-sm"
                                  >
                                    Accepter
                                  </button>
                                  <button
                                    onClick={() => handleStatusUpdate(app.id, 'rejected')}
                                    className="btn btn-danger btn-sm"
                                  >
                                    Rejeter
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  Aucune candidature ne correspond à vos filtres actuels.
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'programs' && (
          <>
            <div className="card">
              <h3 className="card-title">Ajouter un Nouveau Programme de Master</h3>
              <form onSubmit={handleAddMaster} className="program-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom du Master *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="ex. Informatique"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Spécialités Requises *</label>
                    <div className="checkbox-container">
                      {specialities.map((speciality, index) => (
                        <label key={index} className="checkbox-label">
                          <input
                            type="checkbox"
                            value={speciality}
                            checked={selectedSpecialities.includes(speciality)}
                            onChange={() => handleSpecialityChange(speciality)}
                            className="checkbox-input"
                          />
                          <span className="checkbox-custom"></span>
                          {speciality}
                        </label>
                      ))}
                    </div>
                    <small className="form-text text-muted">Sélectionnez au moins une spécialité.</small>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                    required
                    placeholder="Décrivez le programme de master..."
                    className="form-textarea"
                  ></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nombre Maximum d'Étudiants *</label>
                    <input
                      type="number"
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(e.target.value)}
                      required
                      min="1"
                      placeholder="ex. 30"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de Début de Candidature *</label>
                    <input
                      type="date"
                      value={applicationStartDate}
                      onChange={(e) => setApplicationStartDate(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de Fin de Candidature *</label>
                    <input
                      type="date"
                      value={applicationEndDate}
                      onChange={(e) => setApplicationEndDate(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-success btn-add-program"
                >
                  Ajouter le Programme de Master
                </button>
              </form>
            </div>

            <div className="card">
              <h3 className="card-title">Vos Programmes de Master</h3>
              {isLoading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                </div>
              ) : masters.length > 0 ? (
                <ul className="program-list">
                  {masters.map((master) => (
                    <li key={master.id} className="program-item">
                      <div className="program-header">
                        <h4 className="program-title">{master.name}</h4>
                        <button 
                          onClick={() => handleDeleteMaster(master.id)}
                          className="btn-delete-program"
                          title="Supprimer le programme de master"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="program-description">{master.description}</p>
                      <div className="program-details">
                        <span className="detail-badge">
                          Spécialités: {master.specialities.join(', ') || 'Aucune'}
                        </span>
                        <span className="detail-badge">Nombre Max d'Étudiants: {master.max_students}</span>
                        <span className="detail-badge">Candidatures: {master.application_count || 0}</span>
                        <span className="detail-badge period">
                          Période de Candidature: {new Date(master.application_start_date).toLocaleDateString('fr-FR')} - {new Date(master.application_end_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  Vous n’avez ajouté aucun programme de master pour le moment.
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {showApplicationModal && selectedApplication && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Détails de la Candidature</h3>
              <button 
                onClick={() => setShowApplicationModal(false)}
                className="modal-close"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-section">
                  <h4>Informations sur l'Étudiant</h4>
                  <p><span className="label">Email:</span> {selectedApplication.student_email}</p>
                  <p><span className="label">Spécialité:</span> {selectedApplication.student_speciality}</p>
                  {selectedApplication.transcript_pdf && (
                    <p>
                      <span className="label">Relevé de Notes:</span> 
                      <button 
                        className="view-transcript-btn"
                        onClick={() => setShowPdfViewer(true)}
                      >
                        Voir le Relevé de Notes Académique
                      </button>
                      <a 
                        href={`http://localhost:3001/${selectedApplication.transcript_pdf}`} 
                        download
                        className="download-transcript-link"
                      >
                        Télécharger le PDF
                      </a>
                    </p>
                  )}
                </div>
                <div className="detail-section">
                  <h4>Performance Académique</h4>
                  <p><span className="label">Score Calculé:</span> {selectedApplication.calculated_score}</p>
                  <p><span className="label">Note de la 1re Année:</span> {selectedApplication.first_year_mark}</p>
                  <p><span className="label">Note de la 2e Année:</span> {selectedApplication.second_year_mark}</p>
                  <p><span className="label">Note de la 3e Année:</span> {selectedApplication.third_year_mark}</p>
                </div>
                <div className="detail-section">
                  <h4>Programme de Master</h4>
                  <p><span className="label">Nom du Programme:</span> {selectedApplication.master_name}</p>
                  <p><span className="label">Spécialités Requises:</span> {selectedApplication.master_specialities?.length > 0 ? selectedApplication.master_specialities.join(', ') : 'Plusieurs Spécialités'}</p>
                  <p><span className="label">Nombre Max d'Étudiants:</span> {selectedApplication.max_students}</p>
                </div>
                <div className="detail-section">
                  <h4>Statut de la Candidature</h4>
                  <p><span className="label">Statut:</span> <span className={getStatusClass(selectedApplication.status)}>{selectedApplication.status === 'pending' ? 'En Attente' : selectedApplication.status === 'accepted' ? 'Accepté' : 'Rejeté'}</span></p>
                  {selectedApplication.status === 'pending' && (
                    <div className="status-actions">
                      <button
                        onClick={() => handleStatusUpdate(selectedApplication.id, 'accepted')}
                        className="btn btn-success"
                      >
                        Accepter la Candidature
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedApplication.id, 'rejected')}
                        className="btn btn-danger"
                      >
                        Rejeter la Candidature
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowApplicationModal(false)}
                className="btn btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfViewer && selectedApplication?.transcript_pdf && (
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
                  file={`http://localhost:3001/${selectedApplication.transcript_pdf}`}
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
    </div>
  );
}

export default CombinedDashboard;