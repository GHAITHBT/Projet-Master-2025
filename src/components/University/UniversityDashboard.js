import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import './UniversityDashboard.css';

// Set up pdf.js worker to use local file
pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

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
      console.error('Error fetching applications:', err);
      setMessage('Error fetching applications.');
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
      console.error('Error updating status:', err);
      setMessage(err.response?.data?.message || 'Error updating status.');
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
      console.error('Error fetching university masters:', err);
      setMessage('Error fetching your masters. Please try again later.');
      setIsLoading(false);
    }
  };

  const handleAddMaster = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!name.trim() || !description.trim() || !selectedSpecialities.length || !maxStudents || !applicationStartDate || !applicationEndDate) {
      setMessage('Please fill in all required fields, including at least one speciality.');
      return;
    }

    if (new Date(applicationEndDate) <= new Date(applicationStartDate)) {
      setMessage('Application end date must be after start date.');
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
      setMessage(response.data.message || 'Master program added successfully!');
      setName('');
      setDescription('');
      setSelectedSpecialities([]);
      setMaxStudents('');
      setApplicationStartDate('');
      setApplicationEndDate('');
      fetchUniversityMasters();
    } catch (err) {
      console.error('Error adding master:', err);
      setMessage(err.response?.data?.message || 'Error adding master. Please try again.');
    }
  };

  const handleDeleteMaster = async (masterId) => {
    if (window.confirm('Are you sure you want to delete this master program?')) {
      try {
        await axios.delete(`http://localhost:3001/api/university/masters/${masterId}`);
        setMessage('Master program deleted successfully!');
        fetchUniversityMasters();
      } catch (err) {
        console.error('Error deleting master:', err);
        setMessage('Error deleting master program. Please try again.');
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
            <h1 className="dashboard-title">University Management System</h1>
            <p className="dashboard-subtitle">Administration Portal</p>
          </div>
          <div className="user-info">
            <div className="user-profile" onClick={toggleUserInfo}>
              <div className="avatar">{user?.name?.charAt(0) || 'A'}</div>
              <span className="user-greeting">Welcome, {user?.name || 'Admin'}</span>
            </div>
            {showUserInfo && (
              <div className="user-info-dropdown">
                <div className="user-details">
                  <p><span>Name:</span> <span>{user?.name || 'Admin'}</span></p>
                  <p><span>Email:</span> <span>{user?.email || 'admin@example.com'}</span></p>
                  <p><span>Role:</span> <span>University Admin</span></p>
                </div>
                <button 
                  onClick={onLogout} 
                  className="btn btn-danger"
                >
                  Logout
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
            Student Applications
          </button>
          <button 
            className={`tab-button ${activeTab === 'programs' ? 'active' : ''}`}
            onClick={() => setActiveTab('programs')}
          >
            Master Programs
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
              <h2 className="card-title">Dashboard Overview</h2>
              <div className="dashboard-overview">
                <div className="stat-card blue-stat">
                  <h3 className="stat-card-title">Total Applications</h3>
                  <p className="stat-card-value">{applications.length}</p>
                </div>
                <div className="stat-card yellow-stat">
                  <h3 className="stat-card-title">Pending</h3>
                  <p className="stat-card-value">{applications.filter(a => a.status === 'pending').length}</p>
                </div>
                <div className="stat-card green-stat">
                  <h3 className="stat-card-title">Accepted</h3>
                  <p className="stat-card-value">{applications.filter(a => a.status === 'accepted').length}</p>
                </div>
                <div className="stat-card red-stat">
                  <h3 className="stat-card-title">Rejected</h3>
                  <p className="stat-card-value">{applications.filter(a => a.status === 'rejected').length}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="controls-container">
                <h2 className="card-title">Student Applications</h2>
                <div className="filter-controls">
                  <div className="form-group">
                    <label htmlFor="filter" className="form-label">Filter Status</label>
                    <select 
                      id="filter"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="form-select"
                    >
                      <option value="all">All Applications</option>
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="sort" className="form-label">Sort By</label>
                    <select 
                      id="sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="form-select"
                    >
                      <option value="score">Score (Highest First)</option>
                      <option value="speciality">Speciality</option>
                      <option value="date">Date Applied</option>
                    </select>
                  </div>
                  <div className="form-group" style={{justifyContent: 'flex-end'}}>
                    <button 
                      onClick={fetchApplications} 
                      className="btn btn-primary"
                    >
                      Refresh Data
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
                        <th>Student</th>
                        <th>Speciality</th>
                        <th>Score</th>
                        <th>Master Program</th>
                        <th>Status</th>
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
                            <div className="text-secondary">Y1: {app.first_year_mark} | Y2: {app.second_year_mark} | Y3: {app.third_year_mark}</div>
                          </td>
                          <td>
                            <div>{app.master_name}</div>
                            <div className="text-secondary">
                              Required: {app.master_specialities?.length > 0 ? app.master_specialities.join(', ') : 'Multiple Specialities'}
                            </div>
                          </td>
                          <td>
                            <span className={getStatusClass(app.status)}>
                              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => viewApplicationDetails(app)}
                                className="btn btn-primary btn-sm"
                              >
                                View
                              </button>
                              {app.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleStatusUpdate(app.id, 'accepted')}
                                    className="btn btn-success btn-sm"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleStatusUpdate(app.id, 'rejected')}
                                    className="btn btn-danger btn-sm"
                                  >
                                    Reject
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
                  No applications match your current filters.
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'programs' && (
          <>
            <div className="card">
              <h3 className="card-title">Add New Master Program</h3>
              <form onSubmit={handleAddMaster} className="program-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Master Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="e.g. Computer Science"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Required Specialities *</label>
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
                    <small className="form-text text-muted">Select at least one speciality.</small>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                    required
                    placeholder="Describe the master program..."
                    className="form-textarea"
                  ></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Maximum Students *</label>
                    <input
                      type="number"
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(e.target.value)}
                      required
                      min="1"
                      placeholder="e.g. 30"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Application Start Date *</label>
                    <input
                      type="date"
                      value={applicationStartDate}
                      onChange={(e) => setApplicationStartDate(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Application End Date *</label>
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
                  Add Master Program
                </button>
              </form>
            </div>

            <div className="card">
              <h3 className="card-title">Your Master Programs</h3>
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
                          title="Delete master program"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="program-description">{master.description}</p>
                      <div className="program-details">
                        <span className="detail-badge">
                          Specialities: {master.specialities.join(', ') || 'None'}
                        </span>
                        <span className="detail-badge">Max Students: {master.max_students}</span>
                        <span className="detail-badge">Applications: {master.application_count || 0}</span>
                        <span className="detail-badge period">
                          Application Period: {new Date(master.application_start_date).toLocaleDateString()} - {new Date(master.application_end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  You have not added any master programs yet.
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
              <h3 className="modal-title">Application Details</h3>
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
                  <h4>Student Information</h4>
                  <p><span className="label">Email:</span> {selectedApplication.student_email}</p>
                  <p><span className="label">Speciality:</span> {selectedApplication.student_speciality}</p>
                  {selectedApplication.transcript_pdf && (
                    <p>
                      <span className="label">Transcript:</span> 
                      <button 
                        className="view-transcript-btn"
                        onClick={() => setShowPdfViewer(true)}
                      >
                        View Academic Transcript
                      </button>
                      <a 
                        href={`http://localhost:3001/${selectedApplication.transcript_pdf}`} 
                        download
                        className="download-transcript-link"
                      >
                        Download PDF
                      </a>
                    </p>
                  )}
                </div>
                <div className="detail-section">
                  <h4>Academic Performance</h4>
                  <p><span className="label">Calculated Score:</span> {selectedApplication.calculated_score}</p>
                  <p><span className="label">First Year Mark:</span> {selectedApplication.first_year_mark}</p>
                  <p><span className="label">Second Year Mark:</span> {selectedApplication.second_year_mark}</p>
                  <p><span className="label">Third Year Mark:</span> {selectedApplication.third_year_mark}</p>
                </div>
                <div className="detail-section">
                  <h4>Master Program</h4>
                  <p><span className="label">Program Name:</span> {selectedApplication.master_name}</p>
                  <p><span className="label">Required Specialities:</span> {selectedApplication.master_specialities?.length > 0 ? selectedApplication.master_specialities.join(', ') : 'Multiple Specialities'}</p>
                  <p><span className="label">Max Students:</span> {selectedApplication.max_students}</p>
                </div>
                <div className="detail-section">
                  <h4>Application Status</h4>
                  <p><span className="label">Status:</span> <span className={getStatusClass(selectedApplication.status)}>{selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}</span></p>
                  {selectedApplication.status === 'pending' && (
                    <div className="status-actions">
                      <button
                        onClick={() => handleStatusUpdate(selectedApplication.id, 'accepted')}
                        className="btn btn-success"
                      >
                        Accept Application
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedApplication.id, 'rejected')}
                        className="btn btn-danger"
                      >
                        Reject Application
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfViewer && selectedApplication?.transcript_pdf && (
        <div className="modal-overlay">
          <div className="pdf-viewer-modal">
            <div className="modal-header">
              <h3>Academic Transcript</h3>
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
                    console.error('Error loading PDF:', error);
                    setMessage('Error loading PDF. Please try downloading instead.');
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
          </div>
        </div>
      )}
    </div>
  );
}

export default CombinedDashboard;