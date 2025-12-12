# 🧠 Application de Brainstorming

Application simple de brainstorming avec authentification, publication d'idées et téléversement de fichiers.

## 🚀 Installation

1. Cloner le projet et installer les dépendances :
```bash
npm install
```

2. Démarrer l'application :
```bash
npm start
# ou pour le développement avec auto-reload :
npm run dev
```

3. Ouvrir http://localhost:3000

## 👤 Connexion par défaut

- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

## 📁 Structure

- `server.js` - Serveur Express principal
- `db/` - Base de données SQLite
- `public/` - Interface frontend
- `uploads/` - Fichiers téléversés

## ✨ Fonctionnalités

- ✅ Authentification utilisateur
- ✅ Publication d'idées avec fichiers joints
- ✅ Interface d'administration
- ✅ Gestion des utilisateurs
- ✅ Stockage local SQLite

## 🔧 Technologies

- **Backend** : Node.js + Express
- **Base de données** : SQLite
- **Frontend** : HTML/CSS/JavaScript vanilla
- **Sécurité** : bcrypt + sessions