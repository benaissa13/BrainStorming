CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
  is_admin BOOLEAN DEFAULT 0,
  nom TEXT,
  adresse TEXT,
  fonction TEXT,
  projet TEXT,
  telephone TEXT,
  date_naissance TEXT,
  sexe TEXT,
  diplome TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  filename TEXT,
  original_filename TEXT,
  image TEXT,
  original_image_name TEXT,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table pour stocker plusieurs images par idée
CREATE TABLE IF NOT EXISTS idea_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idea_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idea_id) REFERENCES ideas (id) ON DELETE CASCADE
);

-- Table pour gérer les projets d'entreprise
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table pour gérer les types de publications dynamiquement
CREATE TABLE IF NOT EXISTS publication_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '📝',
  color TEXT DEFAULT '#6c757d',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Créer un utilisateur admin par défaut (mot de passe: admin123)
INSERT OR IGNORE INTO users (username, password, is_admin)
VALUES ('admin', '$2b$10$5foFwwMMCjSEoaN4jceQQuGrXYGkwkOFwcu7CTBdi1hywxiaQfOV.', 1);