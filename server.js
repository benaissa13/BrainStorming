const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Créer les dossiers nécessaires
if (!fs.existsSync('./db')) fs.mkdirSync('./db');
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// Base de données
const db = new sqlite3.Database('./db/database.sqlite');

// Configuration multer pour les fichiers
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    // Nettoyer le nom de fichier original
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(sanitizedName);
    cb(null, uniqueName);
  }
});




const a = 5
if(a = 10) {
  console.log("bug !");
}




// Types de fichiers autorisés
const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

// Types d'images autorisés
const allowedImageTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp'
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter
});

// Configuration spéciale pour les fiches signalétiques (PDF et images)
const ficheFilter = (req, file, cb) => {
  const allowedFicheTypes = [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  ];

  if (allowedFicheTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers PDF et images sont autorisés pour les fiches signalétiques'), false);
  }
};

const uploadFiche = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max pour les fiches
  fileFilter: ficheFilter
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'brainstormingSecret2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Initialiser la base de données
db.serialize(() => {
  const initSQL = fs.readFileSync('./db/init.sql', 'utf8');
  db.exec(initSQL, (err) => {
    if (err) console.error('Erreur init DB:', err);
    else console.log('✅ Base de données initialisée');
  });
});

// Middleware d'authentification
function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.status(401).json({ error: 'Non authentifié' });
}

function isAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(403).json({ error: 'Accès admin requis' });
}

// Middleware de validation
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Erreurs de validation:', errors.array());
    return res.status(400).json({
      error: 'Données invalides',
      details: errors.array()
    });
  }
  next();
}

// Route racine - redirection vers login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Route pour vérifier l'authentification
app.get('/api/auth/check', (req, res) => {
  if (req.session.userId) {
    // Récupérer les informations de l'utilisateur
    db.get('SELECT id, username, nom, is_admin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Utilisateur non trouvé' });
      }

      res.json({
        userId: user.id,
        username: user.username,
        nom: user.nom,
        isAdmin: Boolean(user.is_admin)
      });
    });
  } else {
    res.status(401).json({ error: 'Non authentifié' });
  }
});

// Route pour servir les fiches signalétiques
app.get('/uploads/:filename', isAuthenticated, (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);

  // Vérifier que le fichier existe
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).json({ error: 'Fichier non trouvé' });
  }
});

// Routes d'authentification
app.post('/api/login', [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Le nom d\'utilisateur doit faire entre 3 et 50 caractères'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit faire au moins 6 caractères')
], handleValidationErrors, (req, res) => {
  const { username, password } = req.body;
  console.log(`🔐 Tentative de connexion: ${username}`);
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.log(`❌ Erreur DB pour ${username}:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (user && await bcrypt.compare(password, user.password)) {
      console.log(`✅ Connexion réussie pour ${username}`);
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.is_admin;
      res.json({ success: true, isAdmin: user.is_admin });
    } else {
      console.log(`❌ Identifiants invalides pour ${username}`);
      res.status(401).json({ error: 'Identifiants invalides' });
    }
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Route d'inscription publique
app.post('/api/register', [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Le nom d\'utilisateur doit faire entre 3 et 50 caractères'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit faire au moins 6 caractères'),
  body('email').isEmail().withMessage('Format d\'email invalide'),
  body('nom').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit faire entre 2 et 100 caractères'),
  body('adresse').optional().trim().isLength({ max: 200 }).withMessage('L\'adresse ne peut pas dépasser 200 caractères'),
  body('fonction').optional().trim().isLength({ max: 100 }).withMessage('La fonction ne peut pas dépasser 100 caractères'),
  body('projet').optional().trim().isLength({ max: 100 }).withMessage('Le projet ne peut pas dépasser 100 caractères'),
  body('telephone').optional().trim().matches(/^[\+]?[0-9\s\-\(\)]{8,20}$/).withMessage('Format de téléphone invalide'),
  body('date_naissance').optional().isDate().withMessage('Format de date invalide'),
  body('sexe').optional().isIn(['Homme', 'Femme', 'Autre']).withMessage('Sexe doit être Homme, Femme ou Autre'),
  body('diplome').optional().trim().isLength({ max: 150 }).withMessage('Le diplôme ne peut pas dépasser 150 caractères')
], handleValidationErrors, async (req, res) => {
  const {
    username, password, email, nom, adresse, fonction,
    projet, telephone, date_naissance, sexe, diplome
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`📝 Inscription publique: ${username} (${email})`);

    // Vérifier si l'email existe déjà
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
      if (err) {
        console.log(`❌ Erreur vérification email ${email}:`, err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (existingUser) {
        console.log(`❌ Email ${email} déjà utilisé`);
        return res.status(400).json({ error: 'Cette adresse email est déjà utilisée' });
      }

      // Créer l'utilisateur
      db.run(
        `INSERT INTO users (
          username, password, email, is_admin, nom, adresse, fonction,
          projet, telephone, date_naissance, sexe, diplome
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          username, hashedPassword, email, 0, // is_admin = 0 pour les inscriptions publiques
          nom, adresse || null, fonction || null,
          projet || null, telephone || null, date_naissance || null,
          sexe || null, diplome || null
        ],
        function(err) {
          if (err) {
            console.log(`❌ Erreur inscription ${username}:`, err);
            if (err.code === 'SQLITE_CONSTRAINT') {
              if (err.message.includes('username')) {
                return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
              } else if (err.message.includes('email')) {
                return res.status(400).json({ error: 'Cette adresse email est déjà utilisée' });
              }
            }
            return res.status(500).json({ error: 'Erreur lors de l\'inscription' });
          }
          console.log(`✅ Inscription réussie: ${username} (ID: ${this.lastID})`);
          res.json({ success: true, message: 'Inscription réussie ! Vous pouvez maintenant vous connecter.' });
        }
      );
    });
  } catch (error) {
    console.log(`❌ Erreur hashage inscription ${username}:`, error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Routes des idées
app.get('/api/ideas', isAuthenticated, (req, res) => {
  let query, params;

  // Base query
  const baseQuery = `
    SELECT i.*, u.username, u.nom, u.id as author_id,
           p.name as project_name,
           pt.name as type_name, pt.emoji as type_emoji, pt.color as type_color
    FROM ideas i
    JOIN users u ON i.user_id = u.id
    LEFT JOIN projects p ON i.project_id = p.id
    LEFT JOIN publication_types pt ON i.type_id = pt.id
  `;

  const filters = [];
  params = [];

  // Gestion des filtres spéciaux pour les utilisateurs normaux
  if (req.query.user_only === 'true') {
    // Voir seulement ses propres idées
    filters.push('i.user_id = ?');
    params.push(req.session.userId);
    console.log(`👤 ${req.session.username} consulte ses propres idées`);
  } else if (req.query.admin_only === 'true') {
    // Voir seulement les publications des administrateurs
    filters.push('u.is_admin = 1');
    console.log(`👤 ${req.session.username} consulte les publications des administrateurs`);
  } else if (!req.session.isAdmin) {
    // Utilisateur normal sans filtre spécial : voir ses idées + celles des admins
    filters.push('(i.user_id = ? OR u.is_admin = 1)');
    params.push(req.session.userId);
    console.log(`👤 ${req.session.username} consulte ses idées + publications admin`);
  } else {
    // Admin voit tout avec filtres possibles
    console.log(`👑 Admin ${req.session.username} consulte les idées avec filtres`);
  }

  // Filtres additionnels pour les admins
  if (req.session.isAdmin) {
    if (req.query.type) {
      filters.push('pt.name = ?');
      params.push(req.query.type);
    }

    if (req.query.project_id) {
      filters.push('i.project_id = ?');
      params.push(req.query.project_id);
    }

    if (req.query.from) {
      filters.push('date(i.created_at) >= date(?)');
      params.push(req.query.from);
    }

    if (req.query.to) {
      filters.push('date(i.created_at) <= date(?)');
      params.push(req.query.to);
    }
  }

  // Construire la query finale
  query = baseQuery;
  if (filters.length > 0) {
    query += ' WHERE ' + filters.join(' AND ');
  }
  query += ' ORDER BY i.created_at DESC';

  db.all(query, params, async (err, rows) => {
    if (err) {
      console.log(`❌ Erreur lors de la récupération des idées:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    // Pour chaque idée, récupérer ses images
    const ideasWithImages = [];

    for (const idea of rows) {
      // Récupérer les images de cette idée
      const images = await new Promise((resolve) => {
        db.all('SELECT filename, original_filename FROM idea_images WHERE idea_id = ? ORDER BY created_at',
               [idea.id], (err, imageRows) => {
          if (err) {
            console.log(`❌ Erreur récupération images pour idée ${idea.id}:`, err);
            resolve([]);
          } else {
            resolve(imageRows);
          }
        });
      });

      ideasWithImages.push({
        ...idea,
        images: images
      });
    }

    console.log(`📋 ${ideasWithImages.length} idée(s) trouvée(s) avec images`);
    res.json(ideasWithImages);
  });
});

app.post('/api/ideas', isAuthenticated, (req, res, next) => {
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'images', maxCount: 5 }  // Jusqu'à 5 images
  ])(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Le titre doit faire entre 3 et 200 caractères'),
  body('description').optional().isLength({ max: 2000 }).withMessage('La description ne peut pas dépasser 2000 caractères')
], handleValidationErrors, (req, res) => {
  const { title, description, type_id, project_id } = req.body;

  // Gestion du fichier document
  const filename = req.files?.file?.[0]?.filename || null;
  const originalFilename = req.files?.file?.[0]?.originalname || null;

  // Gestion des images multiples
  const images = req.files?.images || [];

  // Validation et nettoyage des données
  const typeId = type_id && type_id !== '' ? parseInt(type_id) : 1; // 1 = brainstorming par défaut
  const projectId = project_id && project_id !== '' ? parseInt(project_id) : null;

  console.log(`💡 Création de publication: "${title}" par ${req.session.username}`);
  console.log(`🏷️ Type ID: ${typeId}`);
  if (projectId) console.log(`📌 Projet ID: ${projectId}`);
  if (filename) console.log(`📎 Fichier joint: ${originalFilename}`);
  if (images.length > 0) console.log(`🖼️ ${images.length} image(s) jointe(s)`);

  // Créer l'idée d'abord
  db.run(
    'INSERT INTO ideas (title, description, filename, original_filename, type_id, project_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, description, filename, originalFilename, typeId, projectId, req.session.userId],
    function(err) {
      if (err) {
        console.log(`❌ Erreur création idée "${title}":`, err);
        return res.status(500).json({ error: 'Erreur lors de la création' });
      }

      const ideaId = this.lastID;
      console.log(`✅ Idée "${title}" créée avec succès (ID: ${ideaId})`);

      // Insérer les images dans la table idea_images
      if (images.length > 0) {
        const stmt = db.prepare('INSERT INTO idea_images (idea_id, filename, original_filename) VALUES (?, ?, ?)');

        images.forEach((image, index) => {
          stmt.run(ideaId, image.filename, image.originalname, (err) => {
            if (err) {
              console.log(`❌ Erreur insertion image ${index + 1}:`, err);
            } else {
              console.log(`✅ Image ${index + 1} ajoutée: ${image.originalname}`);
            }
          });
        });

        stmt.finalize((err) => {
          if (err) {
            console.log(`❌ Erreur finalisation images:`, err);
          } else {
            console.log(`✅ Toutes les images ajoutées pour l'idée ${ideaId}`);
          }
        });
      }

      res.json({ success: true, id: ideaId, imagesCount: images.length });
    }
  );
});

// Route pour supprimer une idée
app.delete('/api/ideas/:id', isAuthenticated, (req, res) => {
  const ideaId = req.params.id;
  console.log(`🗑️ Tentative de suppression de l'idée ${ideaId} par ${req.session.username}`);

  // Vérifier si l'utilisateur peut supprimer cette idée
  db.get('SELECT * FROM ideas WHERE id = ?', [ideaId], (err, idea) => {
    if (err) {
      console.log(`❌ Erreur DB lors de la suppression:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    if (!idea) {
      console.log(`❌ Idée ${ideaId} non trouvée`);
      return res.status(404).json({ error: 'Idée non trouvée' });
    }

    // Seul l'auteur ou un admin peut supprimer
    if (idea.user_id !== req.session.userId && !req.session.isAdmin) {
      console.log(`❌ ${req.session.username} non autorisé à supprimer l'idée ${ideaId}`);
      return res.status(403).json({ error: 'Non autorisé à supprimer cette idée' });
    }

    // Supprimer le fichier associé s'il existe
    if (idea.filename) {
      const filePath = path.join(__dirname, 'uploads', idea.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Supprimer l'idée de la base de données
    db.run('DELETE FROM ideas WHERE id = ?', [ideaId], function(err) {
      if (err) {
        console.log(`❌ Erreur lors de la suppression de l'idée ${ideaId}:`, err);
        return res.status(500).json({ error: 'Erreur lors de la suppression' });
      }
      console.log(`✅ Idée ${ideaId} supprimée avec succès par ${req.session.username}`);
      res.json({ success: true });
    });
  });
});

// Route pour servir les fichiers
app.get('/api/files/:filename', isAuthenticated, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Fichier non trouvé' });
  }
});

// Routes admin
app.post('/api/admin/users', isAuthenticated, isAdmin, [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Le nom d\'utilisateur doit faire entre 3 et 50 caractères'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit faire au moins 6 caractères'),
  body('email').optional().isEmail().withMessage('Format d\'email invalide'),
  body('isAdmin').optional().isBoolean().withMessage('isAdmin doit être un booléen'),
  body('nom').optional().trim().isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('adresse').optional().trim().isLength({ max: 200 }).withMessage('L\'adresse ne peut pas dépasser 200 caractères'),
  body('fonction').optional().trim().isLength({ max: 100 }).withMessage('La fonction ne peut pas dépasser 100 caractères'),
  body('projet').optional().trim().isLength({ max: 100 }).withMessage('Le projet ne peut pas dépasser 100 caractères'),
  body('telephone').optional().trim().matches(/^[\+]?[0-9\s\-\(\)]{8,20}$/).withMessage('Format de téléphone invalide'),
  body('date_naissance').optional().isDate().withMessage('Format de date invalide'),
  body('sexe').optional().isIn(['Homme', 'Femme', 'Autre']).withMessage('Sexe doit être Homme, Femme ou Autre'),
  body('diplome').optional().trim().isLength({ max: 150 }).withMessage('Le diplôme ne peut pas dépasser 150 caractères')
], handleValidationErrors, async (req, res) => {
  const {
    username, password, email, isAdmin = false,
    nom, adresse, fonction, projet, telephone,
    date_naissance, sexe, diplome
  } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`👤 Création d'utilisateur: ${username} avec profil complet`);

    db.run(
      `INSERT INTO users (
        username, password, email, is_admin, nom, adresse, fonction,
        projet, telephone, date_naissance, sexe, diplome
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username, hashedPassword, email || null, isAdmin ? 1 : 0,
        nom || null, adresse || null, fonction || null,
        projet || null, telephone || null, date_naissance || null,
        sexe || null, diplome || null
      ],
      function(err) {
        if (err) {
          console.log(`❌ Erreur création utilisateur ${username}:`, err);
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'Nom d\'utilisateur déjà existant' });
          }
          return res.status(500).json({ error: 'Erreur serveur' });
        }
        console.log(`✅ Utilisateur ${username} créé avec succès (ID: ${this.lastID})`);
        res.json({ success: true, id: this.lastID });
      }
    );
  } catch (error) {
    console.log(`❌ Erreur hashage pour ${username}:`, error);
    res.status(500).json({ error: 'Erreur lors du hashage' });
  }
});

app.get('/api/admin/users', isAuthenticated, isAdmin, (req, res) => {
  db.all(`SELECT
    id, username, email, is_admin, nom, adresse, fonction, projet,
    telephone, date_naissance, sexe, diplome, created_at
    FROM users ORDER BY created_at DESC`, (err, rows) => {
    if (err) {
      console.log(`❌ Erreur récupération utilisateurs:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    console.log(`📋 ${rows.length} utilisateur(s) récupéré(s)`);
    res.json(rows);
  });
});

// Route pour supprimer un utilisateur (admin seulement)
app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, (req, res) => {
  const userId = req.params.id;

  // Empêcher la suppression de son propre compte
  if (parseInt(userId) === req.session.userId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  // Supprimer d'abord les idées de l'utilisateur et leurs fichiers
  db.all('SELECT filename FROM ideas WHERE user_id = ?', [userId], (err, ideas) => {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });

    // Supprimer les fichiers associés
    ideas.forEach(idea => {
      if (idea.filename) {
        const filePath = path.join(__dirname, 'uploads', idea.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    // Supprimer les idées puis l'utilisateur
    db.run('DELETE FROM ideas WHERE user_id = ?', [userId], (err) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });

      db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: 'Erreur serveur' });
        res.json({ success: true });
      });
    });
  });
});

// Route pour changer son mot de passe
app.post('/api/change-password', isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  db.get('SELECT password FROM users WHERE id = ?', [req.session.userId], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    
    if (await bcrypt.compare(currentPassword, user.password)) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.userId], (err) => {
        if (err) return res.status(500).json({ error: 'Erreur serveur' });
        res.json({ success: true });
      });
    } else {
      res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }
  });
});

// Route pour vérifier le statut de connexion
app.get('/api/status', (req, res) => {
  if (req.session.userId) {
    // Récupérer les informations à jour depuis la base de données
    db.get('SELECT id, username, nom, is_admin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (err || !user) {
        return res.json({ authenticated: false });
      }

      res.json({
        authenticated: true,
        userId: user.id,
        username: user.username,
        nom: user.nom,
        isAdmin: Boolean(user.is_admin)
      });
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Endpoint pour récupérer la liste des projets
app.get('/api/projects', isAuthenticated, (req, res) => {
  console.log(`📋 Récupération des projets par ${req.session.username}`);

  db.all('SELECT id, name, description, status FROM projects WHERE status = ? ORDER BY name',
         ['active'], (err, projects) => {
    if (err) {
      console.log(`❌ Erreur récupération projets:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    console.log(`✅ ${projects.length} projet(s) récupéré(s)`);
    res.json(projects);
  });
});

// Endpoint pour récupérer la liste des types de publications
app.get('/api/publication-types', isAuthenticated, (req, res) => {
  console.log(`🏷️ Récupération des types de publications par ${req.session.username}`);

  db.all('SELECT id, name, emoji, color, description FROM publication_types ORDER BY name', (err, types) => {
    if (err) {
      console.log(`❌ Erreur récupération types:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    console.log(`✅ ${types.length} type(s) récupéré(s)`);
    res.json(types);
  });
});

// Endpoint pour récupérer les émojis
app.get('/api/emojis', isAuthenticated, (req, res) => {
  console.log(`📚 Récupération des émojis par ${req.session.username}`);

  const category = req.query.category;
  let query = 'SELECT * FROM emojis';
  let params = [];

  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }

  query += ' ORDER BY category, name';

  db.all(query, params, (err, emojis) => {
    if (err) {
      console.log(`❌ Erreur récupération émojis:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    console.log(`✅ ${emojis.length} émoji(s) récupéré(s)${category ? ` pour la catégorie ${category}` : ''}`);
    res.json(emojis);
  });
});

// Endpoint pour récupérer les catégories d'émojis
app.get('/api/emoji-categories', isAuthenticated, (req, res) => {
  console.log(`📁 Récupération des catégories d'émojis par ${req.session.username}`);

  db.all('SELECT DISTINCT category, COUNT(*) as count FROM emojis GROUP BY category ORDER BY category', (err, categories) => {
    if (err) {
      console.log(`❌ Erreur récupération catégories:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    console.log(`✅ ${categories.length} catégorie(s) d'émojis récupérée(s)`);
    res.json(categories);
  });
});

// Routes pour les profils utilisateurs
app.get('/api/user/:id', isAuthenticated, (req, res) => {
  const userId = req.params.id;
  console.log(`👤 Consultation profil utilisateur ${userId} par ${req.session.username}`);

  db.get(`SELECT
    id, username, email, nom, adresse, fonction, projet,
    telephone, date_naissance, sexe, diplome, is_admin, created_at
    FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      console.log(`❌ Erreur récupération profil ${userId}:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!user) {
      console.log(`❌ Utilisateur ${userId} non trouvé`);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    console.log(`✅ Profil ${user.username} récupéré`);
    res.json(user);
  });
});

// Route pour récupérer les idées d'un utilisateur spécifique
app.get('/api/user/:id/ideas', isAuthenticated, (req, res) => {
  const userId = req.params.id;
  console.log(`💡 Récupération des idées de l'utilisateur ${userId}`);

  db.all(`SELECT
    i.id, i.title, i.description, i.filename, i.original_filename, i.created_at,
    u.username, u.nom
    FROM ideas i
    JOIN users u ON i.user_id = u.id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC`, [userId], async (err, ideas) => {
    if (err) {
      console.log(`❌ Erreur récupération idées utilisateur ${userId}:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    // Pour chaque idée, récupérer ses images
    const ideasWithImages = [];

    for (const idea of ideas) {
      // Récupérer les images de cette idée
      const images = await new Promise((resolve) => {
        db.all('SELECT filename, original_filename FROM idea_images WHERE idea_id = ? ORDER BY created_at',
               [idea.id], (err, imageRows) => {
          if (err) {
            console.log(`❌ Erreur récupération images pour idée ${idea.id}:`, err);
            resolve([]);
          } else {
            resolve(imageRows);
          }
        });
      });

      ideasWithImages.push({
        ...idea,
        images: images
      });
    }

    console.log(`✅ ${ideasWithImages.length} idée(s) trouvée(s) pour l'utilisateur ${userId}`);
    res.json(ideasWithImages);
  });
});

// ==========================================
// ROUTES D'ADMINISTRATION
// ==========================================

// Gestion des types de publications
app.get('/api/admin/types', isAdmin, (req, res) => {
  console.log(`🏷️ Admin ${req.session.username} consulte les types de publications`);

  db.all('SELECT * FROM publication_types ORDER BY name', (err, types) => {
    if (err) {
      console.log(`❌ Erreur récupération types:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    console.log(`✅ ${types.length} type(s) récupéré(s)`);
    res.json(types);
  });
});

app.post('/api/admin/types', isAdmin, [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Le nom doit faire entre 2 et 50 caractères'),
  body('emoji').optional().isLength({ max: 10 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Couleur invalide'),
  body('description').optional().isLength({ max: 200 })
], handleValidationErrors, (req, res) => {
  const { name, emoji, color, description } = req.body;

  console.log(`🏷️ Admin ${req.session.username} ajoute le type: ${name}`);

  db.run(
    'INSERT INTO publication_types (name, emoji, color, description) VALUES (?, ?, ?, ?)',
    [name, emoji || '📝', color || '#6c757d', description || ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Ce type existe déjà' });
        }
        console.log(`❌ Erreur création type:`, err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      console.log(`✅ Type "${name}" créé avec l'ID ${this.lastID}`);
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.delete('/api/admin/types/:id', isAdmin, (req, res) => {
  const typeId = req.params.id;

  console.log(`🏷️ Admin ${req.session.username} supprime le type ID: ${typeId}`);

  // Vérifier si le type est utilisé
  db.get('SELECT COUNT(*) as count FROM ideas WHERE type_id = ?', [typeId], (err, result) => {
    if (err) {
      console.log(`❌ Erreur vérification type:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (result.count > 0) {
      return res.status(400).json({
        error: `Ce type est utilisé par ${result.count} publication(s)`
      });
    }

    // Supprimer le type
    db.run('DELETE FROM publication_types WHERE id = ?', [typeId], function(err) {
      if (err) {
        console.log(`❌ Erreur suppression type:`, err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Type non trouvé' });
      }

      console.log(`✅ Type ID ${typeId} supprimé`);
      res.json({ success: true });
    });
  });
});

// Gestion des projets
app.get('/api/admin/projects', isAdmin, (req, res) => {
  console.log(`📋 Admin ${req.session.username} consulte les projets`);

  db.all(`SELECT id, name, description, status, created_at, intitule, maitre_ouvrage,
                 fiche_signalitique, date_ods, delai, localite, avances, observation
          FROM projects ORDER BY name`, (err, projects) => {
    if (err) {
      console.log(`❌ Erreur récupération projets:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    console.log(`✅ ${projects.length} projet(s) récupéré(s) avec champs algériens`);
    res.json(projects);
  });
});

app.post('/api/admin/projects', isAdmin, uploadFiche.single('fiche_signalitique'), [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit faire entre 2 et 100 caractères'),
  body('description').optional().isLength({ max: 500 }),
  body('intitule').optional().isLength({ max: 200 }).withMessage('L\'intitulé ne peut dépasser 200 caractères'),
  body('maitre_ouvrage').optional().isLength({ max: 150 }).withMessage('Le maître d\'ouvrage ne peut dépasser 150 caractères'),
  body('date_ods').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date ODS doit être au format YYYY-MM-DD'),
  body('delai').optional().isInt({ min: 1, max: 120 }).withMessage('Le délai doit être entre 1 et 120 mois'),
  body('localite').optional().isLength({ max: 100 }).withMessage('La localité ne peut dépasser 100 caractères'),
  body('avances').optional().isLength({ max: 300 }).withMessage('Les avances ne peuvent dépasser 300 caractères'),
  body('observation').optional().isLength({ max: 1000 }).withMessage('L\'observation ne peut dépasser 1000 caractères'),
  body('status').optional().isIn(['active', 'inactive', 'completed']).withMessage('Status invalide')
], handleValidationErrors, (req, res) => {
  const {
    name, description, intitule, maitre_ouvrage, date_ods, delai,
    localite, avances, observation, status
  } = req.body;

  const ficheSignalitique = req.file ? req.file.filename : null;

  console.log(`📋 Admin ${req.session.username} ajoute le projet algérien: ${name}`);
  if (ficheSignalitique) console.log(`📄 Fiche signalétique: ${req.file.originalname}`);

  db.run(`
    INSERT INTO projects
    (name, description, intitule, maitre_ouvrage, fiche_signalitique, date_ods,
     delai, localite, avances, observation, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      description || '',
      intitule || '',
      maitre_ouvrage || '',
      ficheSignalitique,
      date_ods || null,
      delai ? parseInt(delai) : null,
      localite || '',
      avances || '',
      observation || '',
      status || 'active'
    ],
    function(err) {
      if (err) {
        console.log(`❌ Erreur création projet:`, err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      console.log(`✅ Projet algérien "${name}" créé avec l'ID ${this.lastID}`);
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.put('/api/admin/projects/:id', isAdmin, uploadFiche.single('fiche_signalitique'), [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('intitule').optional().isLength({ max: 200 }),
  body('maitre_ouvrage').optional().isLength({ max: 150 }),
  body('date_ods').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  body('delai').optional().isInt({ min: 1, max: 120 }),
  body('localite').optional().isLength({ max: 100 }),
  body('avances').optional().isLength({ max: 300 }),
  body('observation').optional().isLength({ max: 1000 }),
  body('status').optional().isIn(['active', 'inactive', 'completed'])
], handleValidationErrors, (req, res) => {
  const projectId = req.params.id;
  const {
    name, description, intitule, maitre_ouvrage, date_ods, delai,
    localite, avances, observation, status
  } = req.body;

  console.log(`📋 Admin ${req.session.username} modifie le projet algérien ID: ${projectId}`);

  // Si un nouveau fichier est uploadé, l'utiliser, sinon garder l'ancien
  let updateQuery = `
    UPDATE projects
    SET name = ?, description = ?, intitule = ?, maitre_ouvrage = ?,
        date_ods = ?, delai = ?, localite = ?, avances = ?, observation = ?, status = ?
  `;
  let params = [
    name, description || '', intitule || '', maitre_ouvrage || '',
    date_ods || null, delai ? parseInt(delai) : null, localite || '',
    avances || '', observation || '', status || 'active'
  ];

  if (req.file) {
    updateQuery += ', fiche_signalitique = ?';
    params.push(req.file.filename);
    console.log(`📄 Nouvelle fiche signalétique: ${req.file.originalname}`);
  }

  updateQuery += ' WHERE id = ?';
  params.push(projectId);

  db.run(updateQuery, params, function(err) {
    if (err) {
      console.log(`❌ Erreur modification projet:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    console.log(`✅ Projet algérien ID ${projectId} modifié`);
    res.json({ success: true });
  });
});

app.delete('/api/admin/projects/:id', isAdmin, (req, res) => {
  const projectId = req.params.id;

  console.log(`📋 Admin ${req.session.username} supprime le projet ID: ${projectId}`);

  // Vérifier si le projet est utilisé
  db.get('SELECT COUNT(*) as count FROM ideas WHERE project_id = ?', [projectId], (err, result) => {
    if (err) {
      console.log(`❌ Erreur vérification projet:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (result.count > 0) {
      return res.status(400).json({
        error: `Ce projet est utilisé par ${result.count} publication(s)`
      });
    }

    // Supprimer le projet
    db.run('DELETE FROM projects WHERE id = ?', [projectId], function(err) {
      if (err) {
        console.log(`❌ Erreur suppression projet:`, err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      console.log(`✅ Projet ID ${projectId} supprimé`);
      res.json({ success: true });
    });
  });
});

// Gestion des utilisateurs
app.get('/api/admin/users', isAdmin, (req, res) => {
  console.log(`👥 Admin ${req.session.username} consulte les utilisateurs`);

  db.all('SELECT id, username, nom, adresse, is_admin, created_at FROM users ORDER BY username', (err, users) => {
    if (err) {
      console.log(`❌ Erreur récupération utilisateurs:`, err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    console.log(`✅ ${users.length} utilisateur(s) récupéré(s)`);
    res.json(users);
  });
});

app.put('/api/admin/users/:id/admin', isAdmin, (req, res) => {
  const userId = req.params.id;
  const { isAdmin: makeAdmin } = req.body;

  console.log(`👥 Admin ${req.session.username} ${makeAdmin ? 'donne' : 'retire'} les droits admin à l'utilisateur ID: ${userId}`);

  db.run(
    'UPDATE users SET is_admin = ? WHERE id = ?',
    [makeAdmin ? 1 : 0, userId],
    function(err) {
      if (err) {
        console.log(`❌ Erreur modification droits:`, err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      console.log(`✅ Droits admin ${makeAdmin ? 'accordés' : 'retirés'} pour l'utilisateur ID ${userId}`);
      res.json({ success: true });
    }
  );
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur brainstorming démarré sur http://localhost:${PORT}`);
});




const a = 5
if(a = 10) {
  console.log("bug !");
}
