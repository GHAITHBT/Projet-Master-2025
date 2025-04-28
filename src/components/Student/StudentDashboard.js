import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  LogOut, 
  ChevronDown, 
  ChevronUp, 
  Book, 
  Award, 
  MessageSquare, 
  X, 
  Send,
  FileText
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import './StudentDashboard.css';

// Set up pdf.js worker to use local file
pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min copy.mjs';

function StudentDashboard({ user, onLogout }) {
  const [studentData, setStudentData] = useState(null);
  const [firstYearMark, setFirstYearMark] = useState('');
  const [secondYearMark, setSecondYearMark] = useState('');
  const [thirdYearMark, setThirdYearMark] = useState('');
  const [masters, setMasters] = useState([]);
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState('');
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ subject: '', message: '', rating: 5 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('marks');
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    fetchStudentData();
    fetchMasters();
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (studentData?.id) {
      fetchApplications();
    }
  }, [studentData]);

  const fetchStudentData = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/student/data', { userId: user.id });
      setStudentData(response.data.studentData);
      if (response.data.studentData) {
        setFirstYearMark(response.data.studentData.first_year_mark || '');
        setSecondYearMark(response.data.studentData.second_year_mark || '');
        setThirdYearMark(response.data.studentData.third_year_mark || '');
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des données de l’étudiant:', err);
      setMessage('Erreur lors de la récupération des données de l’étudiant.');
    }
  };

  const fetchMasters = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/masters', { speciality: studentData?.speciality });
      setMasters(response.data.masters);
    } catch (err) {
      console.error('Erreur lors de la récupération des masters:', err);
      setMessage('Erreur lors de la récupération des masters.');
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/student/applications', { studentId: studentData?.id });
      setApplications(response.data.applications || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des candidatures:', err);
      setMessage('Erreur lors de la récupération de vos candidatures.');
    }
  };

  const handleUpdateMarks = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await axios.post('http://localhost:3001/api/student/update-marks', {
        userId: user.id,
        firstYearMark: parseFloat(firstYearMark),
        secondYearMark: parseFloat(secondYearMark),
        thirdYearMark: parseFloat(thirdYearMark),
      });
      
      showToast(response.data.message);
      fetchStudentData();
    } catch (err) {
      console.error('Erreur lors de la mise à jour des notes:', err);
      showToast(err.response?.data?.message || 'Erreur lors de la mise à jour des notes.', 'error');
    }
  };

  // Helper function to check if marks and transcript are filled
  const canApply = () => {
    // Check if marks are filled and are valid numbers
    const marksFilled = 
      firstYearMark !== '' && 
      secondYearMark !== '' && 
      thirdYearMark !== '' && 
      !isNaN(parseFloat(firstYearMark)) && 
      !isNaN(parseFloat(secondYearMark)) && 
      !isNaN(parseFloat(thirdYearMark));
    
    // Check if transcript is uploaded
    const transcriptUploaded = studentData?.transcript_pdf && studentData.transcript_pdf !== '';

    return marksFilled && transcriptUploaded;
  };

  const handleApply = async (masterId) => {
    if (!studentData || !studentData.id) {
      showToast('Impossible de postuler. Données de l’étudiant non chargées.', 'error');
      return;
    }

    // Check if the student can apply
    if (!canApply()) {
      showToast('Veuillez remplir toutes vos notes et télécharger votre relevé de notes avant de postuler.', 'error');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3001/api/apply', {
        studentId: studentData.id,
        masterId: masterId,
      });
      showToast(response.data.message);
      fetchApplications();
    } catch (err) {
      console.error('Erreur lors de la candidature:', err);
      showToast(err.response?.data?.message || 'Erreur lors de la candidature au master.', 'error');
    }
  };

  const handleUploadTranscript = async (e) => {
    e.preventDefault();
    if (!transcriptFile || !studentData?.id) {
      showToast('Veuillez sélectionner un fichier PDF et vous assurer que les données de l’étudiant sont chargées.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('transcript', transcriptFile);
    formData.append('studentId', studentData.id);

    try {
      const response = await axios.post('http://localhost:3001/api/student/upload-transcript', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(response.data.message);
      setTranscriptFile(null);
      fetchStudentData();
    } catch (err) {
      console.error('Erreur lors du téléchargement du relevé de notes:', err);
      showToast(err.response?.data?.message || 'Erreur lors du téléchargement du relevé de notes.', 'error');
    }
  };
  
  const handleSubmitFeedback = async () => {
    setIsSubmittingFeedback(true);
    try {
      const response = await axios.post('http://localhost:3001/api/feedback', {
        userId: user.id,
        subject: feedback.subject,
        message: feedback.message,
        rating: feedback.rating,
      });
      showToast(response.data.message);
      setShowFeedback(false);
      setFeedback({ subject: '', message: '', rating: 5 });
    } catch (err) {
      console.error('Erreur lors de l’envoi du retour:', err);
      showToast(err.response?.data?.message || 'Erreur lors de l’envoi du retour.', 'error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  
  const showToast = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => {
      setMessage('');
    }, 5000);
  };

  const getApplicationStatus = (startDate, endDate) => {
    const currentDate = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (currentDate < start) {
      const timeDiff = start - currentDate;
      const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      return { status: 'pending', daysLeft };
    } else if (currentDate > end) {
      return { status: 'closed' };
    } else {
      return { status: 'active' };
    }
  };

  const hasApplied = (masterId) => {
    return applications.some(app => app.master_id === masterId);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <nav className="top-nav">
        <div className="logo">
          <Book size={24} />
          <span>Université de Jendouba</span>
        </div>
        
        <div className="nav-actions">
          <button 
            className="feedback-btn"
            onClick={() => setShowFeedback(true)}
          >
            <MessageSquare size={18} />
            <span>Feedback</span>
          </button>
          
          <div className="user-profile" onClick={() => setShowUserInfo(!showUserInfo)}>
            <div className="avatar">
              <User size={18} />
            </div>
            <span className="username">{user.email.split('@')[0]}</span>
            {showUserInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            
            <AnimatePresence>
              {showUserInfo && (
                <motion.div 
                  className="user-info-dropdown"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="user-details">
                    <p><strong>Email :</strong> {user.email}</p>
                    {studentData && (
                      <>
                        <p><strong>Spécialité :</strong> {studentData.speciality}</p>
                        <p><strong>ID :</strong> #{studentData.id}</p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </nav>
      
      <AnimatePresence>
        {message && (
          <motion.div 
            className={`toast-message ${message.type}`}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div 
        className="dashboard-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="welcome-card"
          variants={itemVariants}
        >
          <div className="welcome-text">
            <h1>Bon retour, {user.email.split('@')[0]} !</h1>
            <p>Voici votre progression académique et vos opportunités</p>
          </div>
          <div className="score-indicator">
            <div className="score-circle">
              <span>{studentData?.calculated_score !== null ? studentData?.calculated_score : '?'}</span>
            </div>
            <p>Score</p>
          </div>
        </motion.div>
        
        <motion.div className="tab-navigation" variants={itemVariants}>
          <button 
            className={`tab-btn ${activeTab === 'marks' ? 'active' : ''}`}
            onClick={() => setActiveTab('marks')}
          >
            <Award size={18} />
            <span>Vos Notes</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'masters' ? 'active' : ''}`}
            onClick={() => setActiveTab('masters')}
          >
            <Book size={18} />
            <span>Programmes de Master</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            <FileText size={18} />
            <span>Vos Candidatures</span>
          </button>
        </motion.div>
        
        <AnimatePresence mode="wait">
          {activeTab === 'marks' && (
            <motion.div 
              className="card marks-card"
              key="marks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h3>Votre Dossier Académique</h3>
              {studentData ? (
                <>
                  <div className="speciality-badge">
                    {studentData.speciality}
                  </div>
                  
                  <form onSubmit={handleUpdateMarks} className="marks-form">
                    <div className="form-group">
                      <label>Note de la Première Année</label>
                      <input
                        type="number"
                        step="0.01"
                        value={firstYearMark}
                        onChange={(e) => setFirstYearMark(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Note de la Deuxième Année</label>
                      <input
                        type="number"
                        step="0.01"
                        value={secondYearMark}
                        onChange={(e) => setSecondYearMark(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Note de la Troisième Année</label>
                      <input
                        type="number"
                        step="0.01"
                        value={thirdYearMark}
                        onChange={(e) => setThirdYearMark(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="update-btn"
                    >
                      Mettre à Jour les Notes et Calculer le Score
                    </button>
                  </form>

                  <div className="transcript-upload-section">
                    <h4>Télécharger le Relevé de Notes Académique</h4>
                    {studentData.transcript_pdf && (
                      <div className="current-transcript">
                        <p>
                          Relevé Actuel : 
                          <button 
                            className="view-transcript-btn"
                            onClick={() => setShowPdfViewer(true)}
                          >
                            Voir le Relevé
                          </button>
                          <a 
                            href={`http://localhost:3001/${studentData.transcript_pdf}`} 
                            download
                            className="download-transcript-link"
                          >
                            Télécharger le PDF
                          </a>
                        </p>
                      </div>
                    )}
                    <form onSubmit={handleUploadTranscript}>
                      <div className="form-group">
                        <label>Télécharger le Relevé PDF (max 10MB)</label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setTranscriptFile(e.target.files[0])}
                        />
                      </div>
                      <button
                        type="submit"
                        className="upload-btn"
                        disabled={!transcriptFile}
                      >
                        Télécharger le Relevé
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <p>Chargement des données de l’étudiant...</p>
              )}
            </motion.div>
          )}
          
          {activeTab === 'masters' && (
            <motion.div 
              className="card masters-card"
              key="masters"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3>Programmes de Master Disponibles</h3>
              <p className="speciality-note">Affichage des programmes pour {studentData?.speciality || 'votre spécialité'}</p>
              
              {/* Add a visible message if the user cannot apply */}
              {!canApply() && (
                <div className="apply-restriction-message">
                  <p>
                    Vous devez remplir toutes vos notes et télécharger votre relevé de notes pour pouvoir postuler à un programme de master.
                  </p>
                </div>
              )}
              
              {masters.length > 0 ? (
                <div className="masters-list">
                  {masters.map((master, index) => {
                    const applicationStatus = getApplicationStatus(master.application_start_date, master.application_end_date);
                    const applied = hasApplied(master.id);
                    const isApplyDisabled = !canApply();
                    return (
                      <motion.div 
                        key={master.id}
                        className="master-item"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="master-content">
                          <h4>{master.name}</h4>
                          <p>{master.description}</p>
                          <div className="master-meta">
                            <span className="meta-item">
                              Spécialités Éligibles : {master.specialities.length > 0 ? master.specialities.join(', ') : 'Plusieurs Spécialités'}
                            </span>
                            <span className="meta-item">Étudiants Max : {master.max_students}</span>
                            <span className="meta-item">
                              Candidatures : {master.application_count}
                            </span>
                            <span className="meta-item application-period">
                              Période de Candidature : {new Date(master.application_start_date).toLocaleDateString('fr-FR')} - {new Date(master.application_end_date).toLocaleDateString('fr-FR')}
                            </span>
                            {applicationStatus.status === 'pending' && (
                              <span className="meta-item application-pending">
                                Ouvre dans {applicationStatus.daysLeft} jour{applicationStatus.daysLeft !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        {applied ? (
                          <span className="applied-status">Candidature Envoyée</span>
                        ) : applicationStatus.status === 'active' ? (
                          <div className="apply-btn-container">
                            <button
                              onClick={() => handleApply(master.id)}
                              className="apply-btn"
                              disabled={isApplyDisabled}
                              title={isApplyDisabled ? "Veuillez remplir toutes vos notes et télécharger votre relevé de notes avant de postuler." : ""}
                            >
                              Postuler
                            </button>
                            {isApplyDisabled && (
                              <span className="apply-tooltip">
                                Veuillez remplir toutes vos notes et télécharger votre relevé de notes.
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="closed-status">
                            {applicationStatus.status === 'pending' ? 'Pas Encore Ouvert' : 'Fermé'}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-masters">
                  <p>Aucun programme de master disponible pour votre spécialité pour le moment.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'applications' && (
            <motion.div 
              className="card applications-card"
              key="applications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3>Vos Candidatures</h3>
              {applications.length > 0 ? (
                <div className="applications-list">
                  {applications.map((app, index) => (
                    <motion.div 
                      key={app.id}
                      className="application-item"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="application-content">
                        <h4>{app.master_name}</h4>
                        <p>Spécialité Requise : {app.master_specialities?.length > 0 ? app.master_specialities.join(', ') : 'Plusieurs Spécialités'}</p>
                        <div className="application-meta">
                          <span className="meta-item">Étudiants Max : {app.max_students}</span>
                          <span className="meta-item">
                            Période de Candidature : {new Date(app.application_start_date).toLocaleDateString('fr-FR')} - {new Date(app.application_end_date).toLocaleDateString('fr-FR')}
                          </span>
                          <span className={`meta-item status-${app.status}`}>
                            Statut : {app.status === 'pending' ? 'En Attente' : app.status === 'accepted' ? 'Accepté' : 'Rejeté'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="no-applications">
                  <p>Vous n’avez encore postulé à aucun programme de master.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <AnimatePresence>
        {showFeedback && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="feedback-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="modal-header">
                <h3>Envoyer un Retour</h3>
                <button className="close-btn" onClick={() => setShowFeedback(false)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Sujet</label>
                  <input 
                    type="text" 
                    placeholder="De quoi s'agit-il ?"
                    value={feedback.subject}
                    onChange={(e) => setFeedback({...feedback, subject: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Message</label>
                  <textarea 
                    placeholder="Dites-nous ce que vous pensez..."
                    value={feedback.message}
                    onChange={(e) => setFeedback({...feedback, message: e.target.value})}
                    rows={5}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Évaluez votre expérience (1-5)</label>
                  <div className="rating-selector">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button 
                        key={num}
                        type="button"
                        className={`rating-btn ${feedback.rating >= num ? 'active' : ''}`}
                        onClick={() => setFeedback({...feedback, rating: num})}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="cancel-btn" 
                  onClick={() => setShowFeedback(false)}
                >
                  Annuler
                </button>
                <button 
                  className="submit-btn"
                  onClick={handleSubmitFeedback}
                  disabled={!feedback.subject || !feedback.message || isSubmittingFeedback}
                >
                  <Send size={16} />
                  <span>{isSubmittingFeedback ? 'Envoi en cours...' : 'Envoyer le Retour'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPdfViewer && studentData?.transcript_pdf && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="pdf-viewer-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="modal-header">
                <h3>Relevé de Notes Académique</h3>
                <button className="close-btn" onClick={() => setShowPdfViewer(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="pdf-viewer">
                  <Document
                    file={`http://localhost:3001/${studentData.transcript_pdf}`}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error) => {
                      console.error('Erreur lors du chargement du PDF:', error);
                      showToast('Erreur lors du chargement du PDF. Essayez de le télécharger à la place.', 'error');
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentDashboard;