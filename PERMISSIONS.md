# 🔐 Système de Permissions - Application Brainstorming

## 📋 Vue d'ensemble

L'application implémente un système de permissions à deux niveaux :
- **Administrateurs** : Accès complet à toutes les fonctionnalités
- **Utilisateurs** : Accès limité à leurs propres contenus

## 👑 Permissions Administrateur

### Visualisation des idées
- ✅ **Voit TOUTES les idées** de tous les utilisateurs
- ✅ Interface spéciale avec badge "Vue Admin"
- ✅ Distinction visuelle des idées d'autres utilisateurs (bordure bleue)
- ✅ Boutons "Supprimer (Admin)" pour les idées d'autres utilisateurs

### Gestion des idées
- ✅ Peut supprimer **n'importe quelle idée**
- ✅ Peut créer ses propres idées
- ✅ Logs détaillés de toutes les actions

### Gestion des utilisateurs
- ✅ Créer de nouveaux utilisateurs
- ✅ Supprimer des utilisateurs (sauf son propre compte)
- ✅ Voir la liste complète des utilisateurs
- ✅ Promouvoir des utilisateurs en admin

## 👤 Permissions Utilisateur Standard

### Visualisation des idées
- ✅ **Voit SEULEMENT ses propres idées**
- ✅ Interface personnalisée "Mes idées"
- ❌ Ne peut pas voir les idées d'autres utilisateurs

### Gestion des idées
- ✅ Peut créer ses propres idées
- ✅ Peut supprimer **seulement ses propres idées**
- ❌ Ne peut pas supprimer les idées d'autres utilisateurs

### Gestion du compte
- ✅ Changer son propre mot de passe
- ❌ Pas d'accès aux fonctions d'administration

## 🔧 Implémentation Technique

### Backend (server.js)

#### Route GET /api/ideas
```javascript
if (req.session.isAdmin) {
    // Admin voit toutes les idées
    query = `SELECT i.*, u.username FROM ideas i JOIN users u ON i.user_id = u.id ORDER BY i.created_at DESC`;
} else {
    // Utilisateur voit seulement ses idées
    query = `SELECT i.*, u.username FROM ideas i JOIN users u ON i.user_id = u.id WHERE i.user_id = ? ORDER BY i.created_at DESC`;
    params = [req.session.userId];
}
```

#### Route DELETE /api/ideas/:id
```javascript
// Seul l'auteur ou un admin peut supprimer
if (idea.user_id !== req.session.userId && !req.session.isAdmin) {
    return res.status(403).json({ error: 'Non autorisé à supprimer cette idée' });
}
```

### Frontend (dashboard.html)

#### Titre dynamique
```javascript
if (data.isAdmin) {
    document.getElementById('ideasTitle').innerHTML = '📋 Toutes les idées (Vue Admin)';
} else {
    document.getElementById('ideasTitle').innerHTML = '📋 Mes idées';
}
```

#### Affichage des cartes d'idées
```javascript
const isOwnIdea = idea.username === currentUser.username;
const isAdmin = currentUser.isAdmin;
const cardClass = isAdmin && !isOwnIdea ? 'idea-card other-user-idea' : 'idea-card';
```

## 🧪 Tests de Validation

### Données de test créées
- **Admin** : 3 idées (2 créées par script + 1 manuelle)
- **Alice** : 2 idées
- **Bob** : 2 idées  
- **Charlie** : 2 idées
- **Total** : 9 idées

### Résultats des tests
```
👑 ADMIN voit : 9 idées (toutes)
👤 ALICE voit : 2 idées (seulement les siennes)
👤 BOB voit : 2 idées (seulement les siennes)
👤 CHARLIE voit : 2 idées (seulement les siennes)
```

## 🔑 Comptes de Test

| Utilisateur | Mot de passe | Rôle | Idées visibles |
|-------------|--------------|------|----------------|
| admin | admin123 | Administrateur | Toutes (9) |
| alice | alice123 | Utilisateur | Ses idées (2) |
| bob | bob123 | Utilisateur | Ses idées (2) |
| charlie | charlie123 | Utilisateur | Ses idées (2) |

## 📊 Logs de Surveillance

Le serveur génère des logs détaillés :

```
👑 Admin [username] consulte toutes les idées
👤 Utilisateur [username] consulte ses idées
📋 [X] idée(s) trouvée(s)
🗑️ Tentative de suppression de l'idée [id] par [username]
✅ Idée [id] supprimée avec succès par [username]
```

## 🎨 Interface Utilisateur

### Pour les Administrateurs
- Badge "Vue Admin" dans le titre
- Badge "Autre utilisateur" sur les idées d'autres personnes
- Bordure bleue sur les cartes d'idées d'autres utilisateurs
- Boutons "Supprimer (Admin)" vs "Supprimer"

### Pour les Utilisateurs
- Titre "Mes idées"
- Seulement leurs propres idées affichées
- Boutons "Supprimer" normaux

## 🔒 Sécurité

### Validation côté serveur
- Vérification des permissions à chaque requête
- Logs de toutes les actions sensibles
- Protection contre l'accès non autorisé

### Validation côté client
- Interface adaptée selon le rôle
- Boutons cachés/affichés selon les permissions
- Messages d'erreur appropriés

## 🚀 Utilisation

1. **Se connecter en tant qu'admin** pour voir toutes les idées
2. **Se connecter en tant qu'utilisateur** pour voir seulement ses idées
3. **Créer des idées** avec n'importe quel compte
4. **Tester la suppression** selon les permissions
5. **Vérifier les logs** dans la console du serveur
