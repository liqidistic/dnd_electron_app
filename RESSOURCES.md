# Liste des ressources utilisées dans le projet DnD Electron App

## 📦 Dépendances NPM

### Production
- **electron** (^39.1.2) - Framework pour créer des applications desktop multiplateformes
- **mysql2** (^3.15.3) - Driver MySQL pour Node.js avec support des promesses
- **bcryptjs** (^2.4.3) - Bibliothèque de hachage de mots de passe
- **dotenv** (^16.6.1) - Gestion des variables d'environnement

## 🎨 Polices de caractères (Google Fonts)

Les polices sont chargées depuis Google Fonts via un `@import` dans le CSS :

- **Cinzel** (weights: 400, 500, 600, 700) - Police fantasy pour les titres
- **Cinzel Decorative** (weights: 400, 700) - Variante décorative pour les avatars
- **Uncial Antiqua** - Police médiévale (importée mais non utilisée actuellement)
- **Lora** (weights: 400, 500, 600) - Police serif pour le texte principal

URL d'import : `https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cinzel+Decorative:wght@400;700&family=Uncial+Antiqua&family=Lora:wght@400;500;600&display=swap`

## 🎨 Ressources graphiques et effets CSS

### Textures et patterns
- **Pattern de grain SVG** - Texture générée inline via data URI pour effet parchemin
- **Dégradés CSS** - Effets de fond avec couleurs fantasy (bruns, ors)
- **Ombres et lueurs** - Effets visuels avec `box-shadow` et `text-shadow`

### Couleurs principales
- **Or/Bronze** : `#d4af37`, `#b8860b`, `#f4d03f`
- **Fond sombre** : `#1a0f0a`, `#2a1f18`, `#1f1611`
- **Texte** : `#f5e6d3`, `#e8d5b7`, `#c9b5a0`

## 🗄️ Base de données

### Système de gestion
- MySQL - Base de données relationnelle
- Configuration via variables d'environnement (`.env`)

### Tables principales
- `utilisateur` - Gestion des utilisateurs
- `table_de_jeu` - Tables de jeu DnD
- `table_joueur` - Relation joueurs/tables
- `personnage` - Personnages des joueurs
- `caracteristique` - Caractéristiques des personnages
- `agenda` - Sessions planifiées

### Initialisation SQL (schéma + données de démo)
- Fichier : `database/init_dndapp.sql`
- Crée la base `dndapp`, toutes les tables et un jeu de données (comptes, une table de jeu, sessions agenda, personnages).
- Exécution : `mysql -u root -p < database/init_dndapp.sql` (depuis la racine du projet) ou via MySQL Workbench.
- Comptes de test : `mjdemo`, `joueur1`, `joueur2` — mot de passe **`demo123`**. Code d’invitation de la table : **`DEMO2026`**.
- **Attention** : le script supprime les tables existantes dans `dndapp` avant de les recréer.

## 🛠️ Technologies et frameworks

### Backend
- **Node.js** - Runtime JavaScript
- **Electron IPC** - Communication entre processus principal et renderer
- **MySQL2** - Connexion et requêtes à la base de données

### Frontend
- **HTML5** - Structure des pages
- **CSS3** - Styles avec :
  - Flexbox
  - CSS Grid
  - Gradients
  - Animations et transitions
  - Media queries (responsive)
- **JavaScript (ES6+)** - Logique applicative côté client

## 📁 Structure des fichiers

### Fichiers principaux
- `DOCUMENTATION_UTILISATEUR.md` - Guide utilisateur (prise en main de l’application)
- `main.js` - Processus principal Electron
- `preload.js` - Script de préchargement pour l'exposition sécurisée de l'API
- `package.json` - Configuration et dépendances du projet

### Pages HTML
- `index.html` / `login.html` - Page de connexion
- `register.html` - Page d'inscription
- `dashboard.html` - Tableau de bord principal
- `create-table.html` - Création de table de jeu
- `join-table.html` - Rejoindre une table
- `table-view.html` - Détails d'une table
- `character.html` - Création de personnage
- `character-edit.html` - Modification de personnage
- `character-view.html` - Fiche personnage

### Scripts et styles
- `renderer.js` - Logique JavaScript côté client
- `styles.css` - Feuille de style principale

## 🔐 Sécurité

- **bcryptjs** - Hachage des mots de passe
- **Context Bridge** - Isolation sécurisée entre processus Electron
- **Content Security Policy** - Protection XSS dans les pages HTML

## 📝 Notes

- Le projet nécessite une connexion Internet pour charger les polices Google Fonts
- La base de données MySQL doit être configurée et accessible
- Les variables d'environnement doivent être définies dans un fichier `.env`
