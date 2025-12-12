# 🧠 Application de Brainstorming - Guide Développeur

## 📋 Vue d'ensemble

Cette application de brainstorming permet aux utilisateurs de :
- S'authentifier avec un système de sessions
- Publier des idées avec descriptions et fichiers joints
- Consulter toutes les idées publiées
- Gérer les utilisateurs (admin uniquement)
- Supprimer ses propres idées ou toutes les idées (admin)

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Serveur** : `server.js` - Serveur Express principal
- **Base de données** : SQLite avec deux tables (`users`, `ideas`)
- **Authentification** : Sessions Express avec bcrypt pour les mots de passe
- **Upload de fichiers** : Multer avec restrictions de sécurité
- **Validation** : express-validator pour valider les entrées

### Frontend (HTML/CSS/JavaScript)
- **Page de connexion** : `public/index.html`
- **Dashboard principal** : `public/dashboard.html`
- **Styles** : `public/styles.css`

### Base de données
- **users** : id, username, password (bcrypt), is_admin, created_at
- **ideas** : id, title, description, filename, original_filename, user_id, created_at

## 🔧 API Endpoints

### Authentification
- `POST /api/login` - Connexion utilisateur
- `POST /api/logout` - Déconnexion
- `GET /api/status` - Vérifier le statut de connexion

### Idées
- `GET /api/ideas` - Lister toutes les idées
- `POST /api/ideas` - Créer une nouvelle idée (avec fichier optionnel)
- `DELETE /api/ideas/:id` - Supprimer une idée (auteur ou admin)

### Fichiers
- `GET /api/files/:filename` - Télécharger un fichier joint

### Administration
- `GET /api/admin/users` - Lister tous les utilisateurs (admin)
- `POST /api/admin/users` - Créer un nouvel utilisateur (admin)
- `DELETE /api/admin/users/:id` - Supprimer un utilisateur (admin)

### Utilisateur
- `POST /api/change-password` - Changer son mot de passe

## 🔒 Sécurité

### Authentification
- Mots de passe hachés avec bcrypt (salt rounds: 10)
- Sessions sécurisées avec secret
- Middleware d'authentification sur toutes les routes protégées

### Upload de fichiers
- Types de fichiers autorisés : images, PDF, documents Office, texte
- Taille maximale : 10MB
- Noms de fichiers nettoyés et uniques
- Stockage dans le dossier `uploads/`

### Validation des données
- Validation côté serveur avec express-validator
- Nettoyage des entrées utilisateur
- Messages d'erreur sécurisés

## 🚀 Déploiement

### Prérequis
- Node.js 16+
- npm ou yarn

### Installation
```bash
npm install
```

### Développement
```bash
npm run dev  # Avec nodemon pour auto-reload
```

### Production
```bash
npm start
```

### Variables d'environnement
- `PORT` : Port du serveur (défaut: 3000)

## 📁 Structure des fichiers

```
├── server.js              # Serveur Express principal
├── package.json           # Dépendances et scripts
├── README.md              # Documentation utilisateur
├── DEVELOPER.md           # Documentation développeur
├── db/
│   ├── init.sql          # Script d'initialisation de la DB
│   └── database.sqlite   # Base de données SQLite (créée automatiquement)
├── public/
│   ├── index.html        # Page de connexion
│   ├── dashboard.html    # Interface principale
│   └── styles.css        # Styles CSS
└── uploads/              # Fichiers uploadés (créé automatiquement)
```

## 🔧 Améliorations possibles

### Fonctionnalités
- [ ] Système de commentaires sur les idées
- [ ] Catégories/tags pour les idées
- [ ] Recherche et filtres
- [ ] Notifications en temps réel
- [ ] Export des idées (PDF, Excel)
- [ ] Système de votes/likes

### Technique
- [ ] Migration vers TypeScript
- [ ] Tests automatisés (Jest, Supertest)
- [ ] API REST complète avec OpenAPI
- [ ] Frontend React/Vue.js
- [ ] Base de données PostgreSQL/MySQL
- [ ] Authentification JWT
- [ ] Rate limiting
- [ ] Logs structurés
- [ ] Docker containerization
- [ ] CI/CD pipeline

### Sécurité
- [ ] HTTPS obligatoire
- [ ] CSP headers
- [ ] Audit de sécurité des dépendances
- [ ] Chiffrement des fichiers sensibles
- [ ] Authentification à deux facteurs

## 🐛 Debugging

### Logs
Le serveur affiche des logs dans la console pour :
- Démarrage du serveur
- Initialisation de la base de données
- Erreurs de base de données

### Base de données
Pour inspecter la base de données SQLite :
```bash
sqlite3 db/database.sqlite
.tables
.schema users
.schema ideas
SELECT * FROM users;
```

### Fichiers uploadés
Les fichiers sont stockés dans `uploads/` avec des noms uniques.
Vérifiez les permissions du dossier si les uploads échouent.

## 📝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajouter nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.
