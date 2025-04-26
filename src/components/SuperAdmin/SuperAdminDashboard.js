import React, { useState, useEffect } from 'react';
import './SuperAdminDashboard.css';

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
    // New state for feedback
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    // Dashboard statistics
    const [stats, setStats] = useState({
        totalUniversities: 0,
        totalMasters: 0,
        totalApplications: 0,
        pendingApplications: 0
    });

    useEffect(() => {
        if (user.role !== 'super_admin') {
            setMessage('Access denied. Super Admin privileges required.');
            setLoading(false);
            return;
        }
        fetchUniversities();
        fetchFeedbacks(); // Fetch feedbacks on mount
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
                throw new Error('Failed to fetch universities');
            }
            
            const data = await response.json();
            setUniversities(data.universities);
            
            // Calculate statistics
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
            console.error('Error fetching universities:', err);
            setMessage('Error fetching universities. Please try again later.');
            setLoading(false);
        }
    };

    // New function to fetch feedbacks
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
                throw new Error('Failed to fetch feedback');
            }

            const data = await response.json();
            setFeedbacks(data.feedbacks);
            setFeedbackLoading(false);
        } catch (err) {
            console.error('Error fetching feedback:', err);
            setMessage('Error fetching feedback. Please try again later.');
            setFeedbackLoading(false);
        }
    };

    const handleAddUniversity = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!newUniName.trim() || !newUniEmail.trim() || !newUniPassword.trim()) {
            setMessage('Please provide university name, email, and password.');
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
                throw new Error(data.message || 'Failed to add university');
            }
            
            setMessage(data.message || 'University added successfully!');
            setNewUniName('');
            setNewUniEmail('');
            setNewUniPassword('');
            fetchUniversities();
        } catch (err) {
            console.error('Error adding university:', err);
            setMessage(err.message || 'Error adding university. Please try again.');
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
            setMessage('Please provide university name and email.');
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
                throw new Error(data.message || 'Failed to update university');
            }
            
            setMessage(data.message || 'University updated successfully!');
            setEditUniId(null);
            setEditUniName('');
            setEditUniEmail('');
            setEditUniPassword('');
            fetchUniversities();
        } catch (err) {
            console.error('Error updating university:', err);
            setMessage(err.message || 'Error updating university. Please try again.');
        }
    };

    const handleDeleteUniversity = async (uniId) => {
        if (window.confirm('Are you sure you want to delete this university and all its master programs?')) {
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
                    throw new Error(data.message || 'Failed to delete university');
                }
                
                setMessage('University deleted successfully!');
                fetchUniversities();
            } catch (err) {
                console.error('Error deleting university:', err);
                setMessage(err.message || 'Error deleting university. Please try again.');
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
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    return (
        <div className="combined-dashboard">
            <header className="dashboard-header">
                <div className="header-container">
                    <div>
                        <h1 className="dashboard-title">Super Admin Dashboard</h1>
                        <p className="dashboard-subtitle">University Management System</p>
                    </div>
                    <div className="user-info">
                        <div className="user-profile" onClick={toggleUserInfo}>
                            <div className="avatar">{user.name?.charAt(0) || 'A'}</div>
                            <span className="user-greeting">{user.name || 'Super Admin'}</span>
                        </div>
                        {showUserInfo && (
                            <div className="user-info-dropdown">
                                <div className="user-details">
                                    <p><span>Name:</span> <span>{user.name}</span></p>
                                    <p><span>Email:</span> <span>{user.email}</span></p>
                                    <p><span>Role:</span> <span>Super Admin</span></p>
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
                {message && (
                    <div className="alert alert-info">{message}</div>
                )}
                
                <div className="dashboard-statistics">
                    <div className="card stat-cards-container">
                        <h2 className="card-title">Dashboard Overview</h2>
                        <div className="dashboard-overview">
                            <div className="stat-card blue-stat">
                                <h3 className="stat-card-title">Universities</h3>
                                <p className="stat-card-value">{stats.totalUniversities}</p>
                            </div>
                            <div className="stat-card green-stat">
                                <h3 className="stat-card-title">Master Programs</h3>
                                <p className="stat-card-value">{stats.totalMasters}</p>
                            </div>
                            <div className="stat-card yellow-stat">
                                <h3 className="stat-card-title">Total Applications</h3>
                                <p className="stat-card-value">{stats.totalApplications}</p>
                            </div>
                            <div className="stat-card red-stat">
                                <h3 className="stat-card-title">Pending Applications</h3>
                                <p className="stat-card-value">{stats.pendingApplications}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card add-university-card">
                    <h3 className="card-title">Add New University</h3>
                    <form onSubmit={handleAddUniversity} className="add-university-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">University Name</label>
                                <input
                                    type="text"
                                    value={newUniName}
                                    onChange={(e) => setNewUniName(e.target.value)}
                                    required
                                    placeholder="e.g. Tech University"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">University Email</label>
                                <input
                                    type="email"
                                    value={newUniEmail}
                                    onChange={(e) => setNewUniEmail(e.target.value)}
                                    required
                                    placeholder="e.g. admin@techuni.edu"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    value={newUniPassword}
                                    onChange={(e) => setNewUniPassword(e.target.value)}
                                    required
                                    placeholder="Enter password"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-button-group">
                                <button
                                    type="submit"
                                    className="btn btn-success"
                                >
                                    Add University
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="card universities-card">
                    <h3 className="card-title">Universities and Master Programs</h3>
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
                                                    <label className="form-label">University Name</label>
                                                    <input
                                                        type="text"
                                                        value={editUniName}
                                                        onChange={(e) => setEditUniName(e.target.value)}
                                                        required
                                                        className="form-input"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">University Email</label>
                                                    <input
                                                        type="email"
                                                        value={editUniEmail}
                                                        onChange={(e) => setEditUniEmail(e.target.value)}
                                                        required
                                                        className="form-input"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">New Password (optional)</label>
                                                    <input
                                                        type="password"
                                                        value={editUniPassword}
                                                        onChange={(e) => setEditUniPassword(e.target.value)}
                                                        placeholder="Enter new password"
                                                        className="form-input"
                                                    />
                                                </div>
                                                <div className="form-button-group">
                                                    <button type="submit" className="btn btn-success btn-sm">Save</button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditUniId(null)}
                                                        className="btn btn-secondary btn-sm"
                                                    >
                                                        Cancel
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
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUniversity(uni.id)}
                                                        className="btn btn-danger btn-sm"
                                                    >
                                                        Delete
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
                                                                            <p>Required: <span className="highlight">{master.required_speciality}</span></p>
                                                                            <p>Max Students: <span className="highlight">{master.max_students}</span></p>
                                                                            <p>Applications: <span className="highlight">{master.application_count || 0}</span></p>
                                                                            <p>
                                                                                Application Period:{' '}
                                                                                <span className="highlight">
                                                                                    {formatDate(master.application_start_date)} - {formatDate(master.application_end_date)}
                                                                                </span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {expandedMaster === master.id && (
                                                                        <div className="application-list">
                                                                            <h5 className="applications-heading">Applications</h5>
                                                                            {master.applications.length > 0 ? (
                                                                                <div className="applications-container">
                                                                                    {master.applications.map((app) => (
                                                                                        <div
                                                                                            key={app.id}
                                                                                            className="application-item"
                                                                                        >
                                                                                            <div className="application-grid">
                                                                                                <div className="application-detail">
                                                                                                    <span className="detail-label">Student:</span>{' '}
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
                                                                                                    <span className="detail-label">Status:</span>{' '}
                                                                                                    <span className={`status-badge status-${app.status}`}>
                                                                                                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="application-detail">
                                                                                                    <span className="detail-label">Marks:</span>{' '}
                                                                                                    <span className="detail-value">
                                                                                                        1st: {app.first_year_mark || 'N/A'}, 
                                                                                                        2nd: {app.second_year_mark || 'N/A'}, 
                                                                                                        3rd: {app.third_year_mark || 'N/A'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <p className="empty-state">
                                                                                    No applications for this master program.
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="empty-state">
                                                            This university has no master programs.
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
                        <div className="empty-state">No universities found.</div>
                    )}
                </div>
                {/* New Feedback Display Section */}
                <div className="card feedback-card">
                    <h3 className="card-title">User Feedback</h3>
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
                                            <span className="feedback-user">By: {feedback.user_name || 'Anonymous'}</span>
                                            <span className="feedback-date">{formatDate(feedback.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="feedback-content">
                                        <p className="feedback-message">{feedback.message}</p>
                                        <div className="feedback-rating">
                                            Rating: {'★'.repeat(feedback.rating)}{'☆'.repeat(5 - feedback.rating)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">No feedback available.</div>
                    )}
                </div>

                
            </main>
        </div>
    );
}

export default SuperAdminDashboard;