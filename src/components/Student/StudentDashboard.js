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
pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

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
      console.error('Error fetching student data:', err);
      setMessage('Error fetching student data.');
    }
  };

  const fetchMasters = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/masters', { speciality: studentData?.speciality });
      setMasters(response.data.masters);
    } catch (err) {
      console.error('Error fetching masters:', err);
      setMessage('Error fetching masters.');
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/student/applications', { studentId: studentData?.id });
      setApplications(response.data.applications || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setMessage('Error fetching your applications.');
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
      console.error('Error updating marks:', err);
      showToast(err.response?.data?.message || 'Error updating marks.', 'error');
    }
  };

  const handleApply = async (masterId) => {
    if (!studentData || !studentData.id) {
      showToast('Cannot apply. Student data not loaded.', 'error');
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
      console.error('Error applying:', err);
      showToast(err.response?.data?.message || 'Error applying for master.', 'error');
    }
  };

  const handleUploadTranscript = async (e) => {
    e.preventDefault();
    if (!transcriptFile || !studentData?.id) {
      showToast('Please select a PDF file and ensure student data is loaded.', 'error');
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
      console.error('Error uploading transcript:', err);
      showToast(err.response?.data?.message || 'Error uploading transcript.', 'error');
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
      console.error('Error submitting feedback:', err);
      showToast(err.response?.data?.message || 'Error submitting feedback.', 'error');
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
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <nav className="top-nav">
  <div className="logo">
    <Book size={24} />
    <span>EduMasters</span>
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
      
      {/* Move the dropdown here, inside the user-profile div */}
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
              <p><strong>Email:</strong> {user.email}</p>
              {studentData && (
                <>
                  <p><strong>Speciality:</strong> {studentData.speciality}</p>
                  <p><strong>ID:</strong> #{studentData.id}</p>
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
            <h1>Welcome back, {user.email.split('@')[0]}!</h1>
            <p>Here's your academic progress and opportunities</p>
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
            <span>Your Marks</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'masters' ? 'active' : ''}`}
            onClick={() => setActiveTab('masters')}
          >
            <Book size={18} />
            <span>Masters Programs</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            <FileText size={18} />
            <span>Your Applications</span>
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
              <h3>Your Academic Record</h3>
              {studentData ? (
                <>
                  <div className="speciality-badge">
                    {studentData.speciality}
                  </div>
                  
                  <form onSubmit={handleUpdateMarks} className="marks-form">
                    <div className="form-group">
                      <label>First Year Mark</label>
                      <input
                        type="number"
                        step="0.01"
                        value={firstYearMark}
                        onChange={(e) => setFirstYearMark(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Second Year Mark</label>
                      <input
                        type="number"
                        step="0.01"
                        value={secondYearMark}
                        onChange={(e) => setSecondYearMark(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Third Year Mark</label>
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
                      Update Marks & Calculate Score
                    </button>
                  </form>

                  <div className="transcript-upload-section">
                    <h4>Upload Academic Transcript</h4>
                    {studentData.transcript_pdf && (
                      <div className="current-transcript">
                        <p>
                          Current Transcript: 
                          <button 
                            className="view-transcript-btn"
                            onClick={() => setShowPdfViewer(true)}
                          >
                            View Transcript
                          </button>
                          <a 
                            href={`http://localhost:3001/${studentData.transcript_pdf}`} 
                            download
                            className="download-transcript-link"
                          >
                            Download PDF
                          </a>
                        </p>
                      </div>
                    )}
                    <form onSubmit={handleUploadTranscript}>
                      <div className="form-group">
                        <label>Upload PDF Transcript (max 10MB)</label>
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
                        Upload Transcript
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <p>Loading student data...</p>
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
              <h3>Available Masters Programs</h3>
              <p className="speciality-note">Showing programs for {studentData?.speciality || 'your speciality'}</p>
              
              {masters.length > 0 ? (
                <div className="masters-list">
                  {masters.map((master, index) => {
                    const applicationStatus = getApplicationStatus(master.application_start_date, master.application_end_date);
                    const applied = hasApplied(master.id);
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
                              Eligible Specialities: {master.specialities.length > 0 ? master.specialities.join(', ') : 'Multiple Specialities'}
                            </span>
                            <span className="meta-item">Max Students: {master.max_students}</span>
                            <span className="meta-item">
                              Applications: {master.application_count}
                            </span>
                            <span className="meta-item application-period">
                              Application Period: {new Date(master.application_start_date).toLocaleDateString()} - {new Date(master.application_end_date).toLocaleDateString()}
                            </span>
                            {applicationStatus.status === 'pending' && (
                              <span className="meta-item application-pending">
                                Opens in {applicationStatus.daysLeft} day{applicationStatus.daysLeft !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        {applied ? (
                          <span className="applied-status">Applied</span>
                        ) : applicationStatus.status === 'active' ? (
                          <button
                            onClick={() => handleApply(master.id)}
                            className="apply-btn"
                          >
                            Apply
                          </button>
                        ) : (
                          <span className="closed-status">
                            {applicationStatus.status === 'pending' ? 'Not Yet Open' : 'Closed'}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-masters">
                  <p>No masters programs available for your speciality yet.</p>
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
              <h3>Your Applications</h3>
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
                        <p>Required Speciality: {app.master_specialities?.length > 0 ? app.master_specialities.join(', ') : 'Multiple Specialities'}</p>
                        <div className="application-meta">
                          <span className="meta-item">Max Students: {app.max_students}</span>
                          <span className="meta-item">
                            Application Period: {new Date(app.application_start_date).toLocaleDateString()} - {new Date(app.application_end_date).toLocaleDateString()}
                          </span>
                          <span className={`meta-item status-${app.status}`}>
                            Status: {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="no-applications">
                  <p>You haven't applied to any master programs yet.</p>
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
                <h3>Send Feedback</h3>
                <button className="close-btn" onClick={() => setShowFeedback(false)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Subject</label>
                  <input 
                    type="text" 
                    placeholder="What's this about?"
                    value={feedback.subject}
                    onChange={(e) => setFeedback({...feedback, subject: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Message</label>
                  <textarea 
                    placeholder="Tell us what you think..."
                    value={feedback.message}
                    onChange={(e) => setFeedback({...feedback, message: e.target.value})}
                    rows={5}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Rate your experience (1-5)</label>
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
                  Cancel
                </button>
                <button 
                  className="submit-btn"
                  onClick={handleSubmitFeedback}
                  disabled={!feedback.subject || !feedback.message || isSubmittingFeedback}
                >
                  <Send size={16} />
                  <span>{isSubmittingFeedback ? 'Sending...' : 'Send Feedback'}</span>
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
                <h3>Academic Transcript</h3>
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
                      console.error('Error loading PDF:', error);
                      showToast('Error loading PDF. Please try downloading instead.', 'error');
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
                        Previous
                      </button>
                      <span>
                        Page {pageNumber} of {numPages}
                      </span>
                      <button
                        disabled={pageNumber >= numPages}
                        onClick={() => setPageNumber(pageNumber + 1)}
                        className="pdf-nav-btn"
                      >
                        Next
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