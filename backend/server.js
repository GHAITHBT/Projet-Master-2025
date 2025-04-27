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
        const uploadDir = './Uploads/transcripts';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        if (!file || !file.originalname) {
            return cb(new Error('Le fichier ou le nom du fichier original est manquant'), null);
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `releve-${req.body.studentId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (!file) {
            return cb(new Error('Aucun fichier fourni'), false);
        }
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('transcript');

// Standard email content
const GMAIL_USER = 'your_email@gmail.com'; // Replace with your Gmail
const GMAIL_PASS = 'your_app_password'; // Replace with your Gmail App Password
const STANDARD_SUBJECT = 'Notification Automatisée';
const STANDARD_BODY = 'Ceci est un courriel généré automatiquement. Merci d’utiliser notre service !';
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
            return res.status(400).json({ message: 'Le fichier est trop volumineux. La taille maximale autorisée est de 10 Mo.' });
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
        return res.status(400).json({ message: 'L’email, le mot de passe, la spécialité et le nom sont requis' });
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

        res.status(201).json({ message: 'Utilisateur inscrit avec succès', userId });
    } catch (error) {
        console.error('Erreur d’inscription:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'Cet email existe déjà' });
        } else {
            res.status(500).json({ message: 'Erreur du serveur lors de l’inscription' });
        }
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'L’email et le mot de passe sont requis' });
    }

    try {
        const [users] = await dbPool.execute(
            'SELECT id, email, role, name FROM users WHERE email = ? AND password = ?',
            [email, password]
        );

        if (users.length > 0) {
            const user = users[0];
            res.status(200).json({ message: 'Connexion réussie', user });
        } else {
            res.status(401).json({ message: 'Identifiants invalides' });
        }
    } catch (error) {
        console.error('Erreur de connexion:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la connexion' });
    }
});

// Fetch student data endpoint
app.post('/api/student/data', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ message: 'L’ID utilisateur est requis' });
    }

    try {
        const [students] = await dbPool.execute(
            'SELECT id, user_id, speciality, first_year_mark, second_year_mark, third_year_mark, calculated_score, transcript_pdf FROM students WHERE user_id = ?',
            [userId]
        );

        if (students.length > 0) {
            res.status(200).json({ studentData: students[0] });
        } else {
            res.status(404).json({ message: 'Données de l’étudiant non trouvées' });
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données de l’étudiant:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la récupération des données de l’étudiant' });
    }
});

// Update student marks endpoint
app.post('/api/student/update-marks', async (req, res) => {
    const { userId, firstYearMark, secondYearMark, thirdYearMark } = req.body;
    if (!userId || firstYearMark === undefined || secondYearMark === undefined || thirdYearMark === undefined) {
        return res.status(400).json({ message: 'L’ID utilisateur et toutes les notes sont requis' });
    }

    const calculatedScore = calculateScore(firstYearMark, secondYearMark, thirdYearMark);

    try {
        await dbPool.execute(
            'UPDATE students SET first_year_mark = ?, second_year_mark = ?, third_year_mark = ?, calculated_score = ? WHERE user_id = ?',
            [firstYearMark, secondYearMark, thirdYearMark, calculatedScore, userId]
        );
        res.status(200).json({ message: 'Notes mises à jour et score calculé avec succès', calculatedScore });
    } catch (error) {
        console.error('Erreur lors de la mise à jour des notes:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la mise à jour des notes' });
    }
});

// Upload transcript PDF
app.post('/api/student/upload-transcript', upload, async (req, res) => {
    const { studentId } = req.body;
    
    if (!studentId || !req.file) {
        return res.status(400).json({ message: 'L’ID étudiant et le fichier PDF sont requis' });
    }

    try {
        const filePath = `uploads/transcripts/${req.file.filename}`;
        
        await dbPool.execute(
            'UPDATE students SET transcript_pdf = ? WHERE id = ?',
            [filePath, studentId]
        );

        res.status(200).json({ message: 'Relevé de notes téléchargé avec succès', filePath });
    } catch (error) {
        console.error('Erreur lors du téléchargement du relevé de notes:', error);
        res.status(500).json({ message: 'Erreur du serveur lors du téléchargement du relevé de notes' });
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
        console.error('Erreur lors de la récupération des masters:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la récupération des masters' });
    }
});

// Apply for master endpoint
app.post('/api/apply', async (req, res) => {
    const { studentId, masterId } = req.body;
    if (!studentId || !masterId) {
        return res.status(400).json({ message: 'L’ID étudiant et l’ID du master sont requis' });
    }

    try {
        const [existingApplication] = await dbPool.execute(
            'SELECT id FROM applications WHERE student_id = ? AND master_id = ?',
            [studentId, masterId]
        );

        if (existingApplication.length > 0) {
            return res.status(409).json({ message: 'Vous avez déjà postulé pour ce master' });
        }

        const [master] = await dbPool.execute(
            'SELECT application_start_date, application_end_date FROM masters WHERE id = ?',
            [masterId]
        );

        if (master.length === 0) {
            return res.status(404).json({ message: 'Programme de master non trouvé' });
        }

        const currentDate = new Date();
        const startDate = new Date(master[0].application_start_date);
        const endDate = new Date(master[0].application_end_date);

        if (currentDate < startDate || currentDate > endDate) {
            return res.status(400).json({ message: 'La période de candidature est fermée' });
        }

        const [student] = await dbPool.execute(
            'SELECT speciality FROM students WHERE id = ?',
            [studentId]
        );

        if (student.length === 0) {
            return res.status(404).json({ message: 'Étudiant non trouvé' });
        }

        const studentSpeciality = student[0].speciality;

        const [allowedSpecialities] = await dbPool.execute(
            'SELECT speciality FROM master_specialities WHERE master_id = ?',
            [masterId]
        );

        const isValidSpeciality = allowedSpecialities.some(s => s.speciality === studentSpeciality);

        if (!isValidSpeciality) {
            return res.status(400).json({ message: `Votre spécialité (${studentSpeciality}) n’est pas éligible pour ce programme de master.` });
        }

        await dbPool.execute(
            'INSERT INTO applications (student_id, master_id, status) VALUES (?, ?, ?)',
            [studentId, masterId, 'pending']
        );
        res.status(201).json({ message: 'Candidature soumise avec succès' });
    } catch (error) {
        console.error('Erreur lors de la candidature:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la soumission de la candidature' });
    }
});

// Fetch student applications endpoint
app.post('/api/student/applications', async (req, res) => {
    const { studentId } = req.body;
    if (!studentId) {
        return res.status(400).json({ message: 'L’ID étudiant est requis' });
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
        console.error('Erreur lors de la récupération des candidatures:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la récupération des candidatures' });
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
        console.error('Erreur lors de la récupération des candidatures:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la récupération des candidatures' });
    }
});

// Update application status endpoint
app.put('/api/admin/applications/:id/status', async (req, res) => {
    const applicationId = req.params.id;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide' });
    }

    try {
        const [result] = await dbPool.execute(
            'UPDATE applications SET status = ? WHERE id = ?',
            [status, applicationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Candidature non trouvée' });
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
                subject: `Statut de Votre Candidature pour ${masterName}`,
                text: `Cher(e) étudiant(e),\n\nVotre candidature pour le master "${masterName}" a été ${status === 'accepted' ? 'acceptée' : 'rejetée'}. Vous pouvez consulter plus de détails sur votre page de candidature.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Erreur lors de l’envoi du courriel:', error);
                } else {
                    console.log('Courriel envoyé:', info.response);
                }
            });
        }

        res.status(200).json({ message: `Statut de la candidature mis à jour à ${status === 'accepted' ? 'accepté' : 'rejeté'}` });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut de la candidature:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la mise à jour du statut de la candidature' });
    }
});

// Add master endpoint
app.post('/api/university/masters', async (req, res) => {
    const { universityId, name, description, specialities, maxStudents, applicationStartDate, applicationEndDate } = req.body;
    if (!universityId || !name || !specialities || !specialities.length || !maxStudents || !applicationStartDate || !applicationEndDate) {
        return res.status(400).json({ message: 'Tous les champs sont requis, y compris au moins une spécialité' });
    }

    try {
        if (new Date(applicationEndDate) <= new Date(applicationStartDate)) {
            return res.status(400).json({ message: 'La date de fin de candidature doit être postérieure à la date de début' });
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
            res.status(201).json({ message: 'Master ajouté avec succès' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erreur lors de l’ajout du master:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de l’ajout du master' });
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
            return res.status(404).json({ message: 'Programme de master non trouvé' });
        }

        res.status(200).json({ message: 'Programme de master supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du master:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la suppression du master' });
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
        console.error('Erreur lors de la récupération des universités:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la récupération des universités' });
    }
});

// Super Admin: Add university endpoint
app.post('/api/superadmin/universities', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Le nom, l’email et le mot de passe sont requis' });
    }

    try {
        const [existingUser] = await dbPool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Cet email existe déjà' });
        }

        await dbPool.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, password, 'university']
        );

        const mailOptions = {
            from: GMAIL_USER,
            to: email,
            subject: 'Compte Universitaire Créé',
            text: `Cher(e) ${name},\n\nVotre compte universitaire a été créé.\n\nEmail : ${email}\nMot de passe : ${password}\n\nVeuillez vous connecter et changer votre mot de passe.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Erreur lors de l’envoi du courriel:', error);
            } else {
                console.log('Courriel envoyé:', info.response);
            }
        });

        res.status(201).json({ message: 'Université ajoutée avec succès' });
    } catch (error) {
        console.error('Erreur lors de l’ajout de l’université:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de l’ajout de l’université' });
    }
});

// Super Admin: Update university endpoint
app.put('/api/superadmin/universities/:id', async (req, res) => {
    const uniId = req.params.id;
    const { name, email, password } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Le nom et l’email sont requis' });
    }

    try {
        const [existingUser] = await dbPool.execute(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, uniId]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Cet email existe déjà' });
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
            return res.status(404).json({ message: 'Université non trouvée' });
        }

        if (password) {
            const mailOptions = {
                from: GMAIL_USER,
                to: email,
                subject: 'Compte Universitaire Mis à Jour',
                text: `Cher(e) ${name},\n\nVotre compte universitaire a été mis à jour.\n\nEmail : ${email}\nNouveau mot de passe : ${password}\n\nVeuillez vous connecter avec vos nouveaux identifiants.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Erreur lors de l’envoi du courriel:', error);
                } else {
                    console.log('Courriel envoyé:', info.response);
                }
            });
        }

        res.status(200).json({ message: 'Université mise à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l’université:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la mise à jour de l’université' });
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
            return res.status(404).json({ message: 'Université non trouvée' });
        }

        res.status(200).json({ message: 'Université supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l’université:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la suppression de l’université' });
    }
});

// Submit feedback endpoint
app.post('/api/feedback', async (req, res) => {
    const { userId, subject, message, rating } = req.body;

    if (!userId || !subject || !message || !rating) {
        return res.status(400).json({ message: 'L’ID utilisateur, le sujet, le message et l’évaluation sont requis' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'L’évaluation doit être comprise entre 1 et 5' });
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
            subject: `Nouveau Retour : ${subject}`,
            text: `Nouveau retour de l’utilisateur ID ${userId} :\n\nSujet : ${subject}\nÉvaluation : ${rating}/5\nMessage : ${message}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Erreur lors de l’envoi du courriel de retour:', error);
            } else {
                console.log('Courriel de retour envoyé:', info.response);
            }
        });

        res.status(201).json({ message: 'Retour soumis avec succès' });
    } catch (error) {
        console.error('Erreur lors de la soumission du retour:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la soumission du retour' });
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
        console.error('Erreur lors de la récupération des retours:', error);
        res.status(500).json({ message: 'Erreur du serveur lors de la récupération des retours' });
    }
});

app.listen(port, () => {
    console.log(`Serveur backend en cours d’exécution sur http://localhost:${port}`);
});