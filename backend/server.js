const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Passw0rd123',
    database: 'university_masters_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/transcripts';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        if (!file || !file.originalname) {
            return cb(new Error('File or file.originalname is missing'), null);
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `transcript-${req.body.studentId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (!file) {
            return cb(new Error('No file provided'), false);
        }
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('transcript');

// Standard email content
const GMAIL_USER = 'your_email@gmail.com'; // Replace with your Gmail
const GMAIL_PASS = 'your_app_password'; // Replace with your Gmail App Password
const STANDARD_SUBJECT = 'Automated Notification';
const STANDARD_BODY = 'This is an automatically generated email. Thank you for using our service!';
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
    },
    tls: {
        rejectUnauthorized: true
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Error handling middleware for multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File is too large. Maximum size allowed is 10MB.' });
        }
        return res.status(400).json({ message: err.message });
    } else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
});

function calculateScore(firstYear, secondYear, thirdYear) {
    const fy = parseFloat(firstYear) || 0;
    const sy = parseFloat(secondYear) || 0;
    const ty = parseFloat(thirdYear) || 0;
    return (ty * 2) + fy + (fy / 3);
}

// Register endpoint
app.post('/api/register', async (req, res) => {
    const { email, password, speciality, name } = req.body;
    if (!email || !password || !speciality || !name) {
        return res.status(400).json({ message: 'Email, password, speciality, and name are required' });
    }

    try {
        const [userResult] = await dbPool.execute(
            'INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)',
            [email, password, 'student', name]
        );
        const userId = userResult.insertId;

        await dbPool.execute(
            'INSERT INTO students (user_id, speciality) VALUES (?, ?)',
            [userId, speciality]
        );

        res.status(201).json({ message: 'User registered successfully', userId });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'Email already exists' });
        } else {
            res.status(500).json({ message: 'Server error during registration' });
        }
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const [users] = await dbPool.execute(
            'SELECT id, email, role, name FROM users WHERE email = ? AND password = ?',
            [email, password]
        );

        if (users.length > 0) {
            const user = users[0];
            res.status(200).json({ message: 'Login successful', user });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Fetch student data endpoint
app.post('/api/student/data', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const [students] = await dbPool.execute(
            'SELECT id, user_id, speciality, first_year_mark, second_year_mark, third_year_mark, calculated_score, transcript_pdf FROM students WHERE user_id = ?',
            [userId]
        );

        if (students.length > 0) {
            res.status(200).json({ studentData: students[0] });
        } else {
            res.status(404).json({ message: 'Student data not found' });
        }
    } catch (error) {
        console.error('Fetch student data error:', error);
        res.status(500).json({ message: 'Server error fetching student data' });
    }
});

// Update student marks endpoint
app.post('/api/student/update-marks', async (req, res) => {
    const { userId, firstYearMark, secondYearMark, thirdYearMark } = req.body;
    if (!userId || firstYearMark === undefined || secondYearMark === undefined || thirdYearMark === undefined) {
        return res.status(400).json({ message: 'User ID and all marks are required' });
    }

    const calculatedScore = calculateScore(firstYearMark, secondYearMark, thirdYearMark);

    try {
        await dbPool.execute(
            'UPDATE students SET first_year_mark = ?, second_year_mark = ?, third_year_mark = ?, calculated_score = ? WHERE user_id = ?',
            [firstYearMark, secondYearMark, thirdYearMark, calculatedScore, userId]
        );
        res.status(200).json({ message: 'Marks updated and score calculated successfully', calculatedScore });
    } catch (error) {
        console.error('Update marks error:', error);
        res.status(500).json({ message: 'Server error updating marks' });
    }
});

// Upload transcript PDF
app.post('/api/student/upload-transcript', upload, async (req, res) => {
    const { studentId } = req.body;
    
    if (!studentId || !req.file) {
        return res.status(400).json({ message: 'Student ID and PDF file are required' });
    }

    try {
        const filePath = `uploads/transcripts/${req.file.filename}`;
        
        await dbPool.execute(
            'UPDATE students SET transcript_pdf = ? WHERE id = ?',
            [filePath, studentId]
        );

        res.status(200).json({ message: 'Transcript uploaded successfully', filePath });
    } catch (error) {
        console.error('Upload transcript error:', error);
        res.status(500).json({ message: 'Server error uploading transcript' });
    }
});

// Fetch masters endpoint
app.post('/api/masters', async (req, res) => {
    try {
        const { speciality } = req.body || {};
        let query = `
            SELECT m.*, u.email as university_email, 
                   (SELECT COUNT(*) FROM applications a WHERE a.master_id = m.id) as application_count,
                   GROUP_CONCAT(ms.speciality) as specialities
            FROM masters m 
            JOIN users u ON m.university_id = u.id
            LEFT JOIN master_specialities ms ON m.id = ms.master_id`;
        const params = [];

        if (speciality) {
            query += ' WHERE m.id IN (SELECT master_id FROM master_specialities WHERE speciality = ?)';
            params.push(speciality);
        }

        query += ' GROUP BY m.id';

        const [masters] = await dbPool.execute(query, params);
        masters.forEach(master => {
            master.specialities = master.specialities ? master.specialities.split(',') : [];
        });

        res.status(200).json({ masters });
    } catch (error) {
        console.error('Fetch masters error:', error);
        res.status(500).json({ message: 'Server error fetching masters' });
    }
});

// Apply for master endpoint
app.post('/api/apply', async (req, res) => {
    const { studentId, masterId } = req.body;
    if (!studentId || !masterId) {
        return res.status(400).json({ message: 'Student ID and Master ID are required' });
    }

    try {
        const [existingApplication] = await dbPool.execute(
            'SELECT id FROM applications WHERE student_id = ? AND master_id = ?',
            [studentId, masterId]
        );

        if (existingApplication.length > 0) {
            return res.status(409).json({ message: 'You have already applied for this master' });
        }

        const [master] = await dbPool.execute(
            'SELECT application_start_date, application_end_date FROM masters WHERE id = ?',
            [masterId]
        );

        if (master.length === 0) {
            return res.status(404).json({ message: 'Master program not found' });
        }

        const currentDate = new Date();
        const startDate = new Date(master[0].application_start_date);
        const endDate = new Date(master[0].application_end_date);

        if (currentDate < startDate || currentDate > endDate) {
            return res.status(400).json({ message: 'Application period is closed' });
        }

        const [student] = await dbPool.execute(
            'SELECT speciality FROM students WHERE id = ?',
            [studentId]
        );

        if (student.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const studentSpeciality = student[0].speciality;

        const [allowedSpecialities] = await dbPool.execute(
            'SELECT speciality FROM master_specialities WHERE master_id = ?',
            [masterId]
        );

        const isValidSpeciality = allowedSpecialities.some(s => s.speciality === studentSpeciality);

        if (!isValidSpeciality) {
            return res.status(400).json({ message: `Your speciality (${studentSpeciality}) is not eligible for this master program.` });
        }

        await dbPool.execute(
            'INSERT INTO applications (student_id, master_id, status) VALUES (?, ?, ?)',
            [studentId, masterId, 'pending']
        );
        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        console.error('Apply error:', error);
        res.status(500).json({ message: 'Server error submitting application' });
    }
});

// Fetch student applications endpoint
app.post('/api/student/applications', async (req, res) => {
    const { studentId } = req.body;
    if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required' });
    }

    try {
        const [applications] = await dbPool.execute(
            `SELECT a.*, m.name as master_name, 
             GROUP_CONCAT(ms.speciality) as master_specialities,
             m.max_students, m.application_start_date, m.application_end_date
             FROM applications a
             JOIN masters m ON a.master_id = m.id
             LEFT JOIN master_specialities ms ON m.id = ms.master_id
             WHERE a.student_id = ?
             GROUP BY a.id`,
            [studentId]
        );

        applications.forEach(app => {
            app.master_specialities = app.master_specialities ? app.master_specialities.split(',') : [];
        });

        res.status(200).json({ applications });
    } catch (error) {
        console.error('Fetch student applications error:', error);
        res.status(500).json({ message: 'Server error fetching student applications' });
    }
});

// Fetch admin applications endpoint
app.get('/api/admin/applications', async (req, res) => {
    try {
        const [applications] = await dbPool.execute(
            `SELECT
                a.*,
                s.first_year_mark, s.second_year_mark, s.third_year_mark, s.calculated_score, s.speciality as student_speciality, s.transcript_pdf,
                u.email as student_email,
                m.name as master_name, GROUP_CONCAT(ms.speciality) as master_specialities, m.max_students
             FROM applications a
             JOIN students s ON a.student_id = s.id
             JOIN users u ON s.user_id = u.id
             JOIN masters m ON a.master_id = m.id
             LEFT JOIN master_specialities ms ON m.id = ms.master_id
             GROUP BY a.id`
        );

        applications.forEach(app => {
            app.master_specialities = app.master_specialities ? app.master_specialities.split(',') : [];
        });

        res.status(200).json({ applications });
    } catch (error) {
        console.error('Fetch applications error:', error);
        res.status(500).json({ message: 'Server error fetching applications' });
    }
});

// Update application status endpoint
app.put('/api/admin/applications/:id/status', async (req, res) => {
    const applicationId = req.params.id;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const [result] = await dbPool.execute(
            'UPDATE applications SET status = ? WHERE id = ?',
            [status, applicationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const [applicationDetails] = await dbPool.execute(
            `SELECT u.email, m.name as master_name
             FROM applications a
             JOIN students s ON a.student_id = s.id
             JOIN users u ON s.user_id = u.id
             JOIN masters m ON a.master_id = m.id
             WHERE a.id = ?`,
            [applicationId]
        );

        if (applicationDetails.length > 0) {
            const studentEmail = applicationDetails[0].email;
            const masterName = applicationDetails[0].master_name;

            const mailOptions = {
                from: GMAIL_USER,
                to: studentEmail,
                subject: `Your Application Status for ${masterName}`,
                text: `Dear student, your application for the master "${masterName}" has been ${status}. You can see more details on your subscription page.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
        }

        res.status(200).json({ message: `Application status updated to ${status}` });
    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({ message: 'Server error updating application status' });
    }
});

// Add master endpoint
app.post('/api/university/masters', async (req, res) => {
    const { universityId, name, description, specialities, maxStudents, applicationStartDate, applicationEndDate } = req.body;
    if (!universityId || !name || !specialities || !specialities.length || !maxStudents || !applicationStartDate || !applicationEndDate) {
        return res.status(400).json({ message: 'All fields are required, including at least one speciality' });
    }

    try {
        if (new Date(applicationEndDate) <= new Date(applicationStartDate)) {
            return res.status(400).json({ message: 'Application end date must be after start date' });
        }

        const connection = await dbPool.getConnection();
        await connection.beginTransaction();

        try {
            const [masterResult] = await connection.execute(
                'INSERT INTO masters (university_id, name, description, max_students, application_start_date, application_end_date) VALUES (?, ?, ?, ?, ?, ?)',
                [universityId, name, description, maxStudents, applicationStartDate, applicationEndDate]
            );
            const masterId = masterResult.insertId;

            const specialityValues = specialities.map(speciality => [masterId, speciality]);
            await connection.query(
                'INSERT INTO master_specialities (master_id, speciality) VALUES ?',
                [specialityValues]
            );

            await connection.commit();
            res.status(201).json({ message: 'Master added successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Add master error:', error);
        res.status(500).json({ message: 'Server error adding master' });
    }
});

// Delete master endpoint
app.delete('/api/university/masters/:id', async (req, res) => {
    const masterId = req.params.id;

    try {
        const [result] = await dbPool.execute(
            'DELETE FROM masters WHERE id = ?',
            [masterId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Master program not found' });
        }

        res.status(200).json({ message: 'Master program deleted successfully' });
    } catch (error) {
        console.error('Delete master error:', error);
        res.status(500).json({ message: 'Server error deleting master' });
    }
});

// Super Admin: Fetch universities endpoint
app.get('/api/superadmin/universities', async (req, res) => {
    try {
        const [universities] = await dbPool.execute(
            'SELECT id, name, email FROM users WHERE role = ?',
            ['university']
        );

        const universitiesWithMasters = await Promise.all(
            universities.map(async (uni) => {
                const [masters] = await dbPool.execute(
                    `SELECT m.*, 
                            (SELECT COUNT(*) FROM applications a WHERE a.master_id = m.id) as application_count,
                            GROUP_CONCAT(ms.speciality) as specialities
                     FROM masters m
                     LEFT JOIN master_specialities ms ON m.id = ms.master_id
                     WHERE m.university_id = ?
                     GROUP BY m.id`,
                    [uni.id]
                );

                const mastersWithApplications = await Promise.all(
                    masters.map(async (master) => {
                        master.specialities = master.specialities ? master.specialities.split(',') : [];
                        const [applications] = await dbPool.execute(
                            `SELECT
                                a.id, a.status,
                                s.first_year_mark, s.second_year_mark, s.third_year_mark, s.calculated_score, s.speciality as student_speciality,
                                u.email as student_email
                             FROM applications a
                             JOIN students s ON a.student_id = s.id
                             JOIN users u ON s.user_id = u.id
                             WHERE a.master_id = ?`,
                            [master.id]
                        );
                        return { ...master, applications };
                    })
                );

                return { ...uni, masters: mastersWithApplications };
            })
        );

        res.status(200).json({ universities: universitiesWithMasters });
    } catch (error) {
        console.error('Fetch universities error:', error);
        res.status(500).json({ message: 'Server error fetching universities' });
    }
});

// Super Admin: Add university endpoint
app.post('/api/superadmin/universities', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    try {
        const [existingUser] = await dbPool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        await dbPool.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, password, 'university']
        );

        const mailOptions = {
            from: GMAIL_USER,
            to: email,
            subject: 'University Account Created',
            text: `Dear ${name},\n\nYour university account has been created.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease login and change your password.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        res.status(201).json({ message: 'University added successfully' });
    } catch (error) {
        console.error('Add university error:', error);
        res.status(500).json({ message: 'Server error adding university' });
    }
});

// Super Admin: Update university endpoint
app.put('/api/superadmin/universities/:id', async (req, res) => {
    const uniId = req.params.id;
    const { name, email, password } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }

    try {
        const [existingUser] = await dbPool.execute(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, uniId]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        let query = 'UPDATE users SET name = ?, email = ?';
        const params = [name, email];

        if (password) {
            query += ', password = ?';
            params.push(password);
        }

        query += ' WHERE id = ? AND role = ?';
        params.push(uniId, 'university');

        const [result] = await dbPool.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'University not found' });
        }

        if (password) {
            const mailOptions = {
                from: GMAIL_USER,
                to: email,
                subject: 'University Account Updated',
                text: `Dear ${name},\n\nYour university account has been updated.\n\nEmail: ${email}\nNew Password: ${password}\n\nPlease login with your new credentials.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
        }

        res.status(200).json({ message: 'University updated successfully' });
    } catch (error) {
        console.error('Update university error:', error);
        res.status(500).json({ message: 'Server error updating university' });
    }
});

// Super Admin: Delete university endpoint
app.delete('/api/superadmin/universities/:id', async (req, res) => {
    const uniId = req.params.id;

    try {
        const [result] = await dbPool.execute(
            'DELETE FROM users WHERE id = ? AND role = ?',
            [uniId, 'university']
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'University not found' });
        }

        res.status(200).json({ message: 'University deleted successfully' });
    } catch (error) {
        console.error('Delete university error:', error);
        res.status(500).json({ message: 'Server error deleting university' });
    }
});

// Submit feedback endpoint
app.post('/api/feedback', async (req, res) => {
    const { userId, subject, message, rating } = req.body;

    if (!userId || !subject || !message || !rating) {
        return res.status(400).json({ message: 'User ID, subject, message, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    try {
        await dbPool.execute(
            'INSERT INTO feedback (user_id, subject, message, rating) VALUES (?, ?, ?, ?)',
            [userId, subject, message, rating]
        );

        // Optional: Send email notification to admin
        const mailOptions = {
            from: GMAIL_USER,
            to: 'admin@yourdomain.com', // Replace with your admin email
            subject: `New Feedback: ${subject}`,
            text: `New feedback from user ID ${userId}:\n\nSubject: ${subject}\nRating: ${rating}/5\nMessage: ${message}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending feedback email:', error);
            } else {
                console.log('Feedback email sent:', info.response);
            }
        });

        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({ message: 'Server error submitting feedback' });
    }
});
// Super Admin: Fetch feedback endpoint
app.get('/api/superadmin/feedback', async (req, res) => {
    try {
        const [feedbacks] = await dbPool.execute(
            `SELECT f.id, f.subject, f.message, f.rating, f.created_at, u.name as user_name
             FROM feedback f
             JOIN users u ON f.user_id = u.id
             ORDER BY f.created_at DESC`
        );

        res.status(200).json({ feedbacks });
    } catch (error) {
        console.error('Fetch feedback error:', error);
        res.status(500).json({ message: 'Server error fetching feedback' });
    }
});
app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});