# Descriptif de la réalisation professionnelle
## Application de gestion de tables de jeu Donjons & Dragons

---

## 1. Contexte et objectifs

### 1.1 Contexte
Développement d'une application desktop multiplateforme pour la gestion de tables de jeu Donjons & Dragons (DnD). L'application permet aux joueurs et maîtres de jeu (MJ) d'organiser leurs parties, gérer leurs personnages et planifier leurs sessions.

### 1.2 Objectifs
- **Gestion des utilisateurs** : Système d'authentification sécurisé
- **Gestion des tables de jeu** : Création, organisation et gestion de tables DnD
- **Gestion des personnages** : Création, modification et consultation de fiches de personnages
- **Planification** : Agenda pour organiser les sessions de jeu
- **Interface utilisateur** : Design fantasy immersif et intuitif

---

## 2. Architecture technique

### 2.1 Stack technologique

```
┌─────────────────────────────────────────┐
│         APPLICATION ELECTRON            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐      ┌─────────────┐ │
│  │  Main Process│◄────►│  Renderer   │ │
│  │  (Node.js)   │ IPC  │  (Browser)  │ │
│  └──────┬───────┘      └─────────────┘ │
│         │                               │
│         ▼                               │
│  ┌──────────────┐                      │
│  │   MySQL DB   │                      │
│  └──────────────┘                      │
│                                         │
└─────────────────────────────────────────┘
```

**Technologies principales :**
- **Electron 39.1.2** : Framework pour application desktop
- **Node.js** : Runtime JavaScript côté serveur
- **MySQL2 3.15.3** : Base de données relationnelle
- **bcryptjs 2.4.3** : Hachage sécurisé des mots de passe
- **HTML5/CSS3/JavaScript ES6+** : Frontend

### 2.2 Architecture en couches

```
┌─────────────────────────────────────────────────┐
│           COUCHE PRÉSENTATION                   │
│  HTML5 + CSS3 (Thème fantasy) + JavaScript     │
│  - Pages : login, dashboard, tables, personnages│
│  - Interface responsive et immersive            │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│         COUCHE LOGIQUE MÉTIER                   │
│  renderer.js (Client)                           │
│  - Gestion des formulaires                       │
│  - Validation des données                        │
│  - Communication IPC                             │
└──────────────────┬──────────────────────────────┘
                   │ IPC (Inter-Process Communication)
┌──────────────────▼──────────────────────────────┐
│         COUCHE ACCÈS DONNÉES                    │
│  main.js (Processus principal)                  │
│  - Handlers IPC                                  │
│  - Requêtes SQL                                  │
│  - Gestion des transactions                      │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│            BASE DE DONNÉES                      │
│  MySQL / MariaDB                                 │
│  - Tables relationnelles                         │
│  - Contraintes d'intégrité                       │
└──────────────────────────────────────────────────┘
```

---

## 3. Modèle de données

### 3.1 Schéma de base de données

```
┌─────────────────┐
│   utilisateur   │
├─────────────────┤
│ id_user (PK)    │
│ login           │
│ password (hash) │
│ pseudo          │
│ email           │
└────────┬────────┘
         │
         │ 1:N
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ table_de_jeu    │  │   personnage    │
├─────────────────┤  ├─────────────────┤
│ id_table (PK)   │  │ id_character(PK)│
│ nom             │  │ nom             │
│ description     │  │ race             │
│ id_mj (FK)      │  │ classe          │
│ max_joueurs     │  │ niveau          │
│ code_invitation │  │ id_user (FK)    │
│ prochaine_session│ │ id_table (FK)   │
└────────┬────────┘  │ avatar          │
         │           └────────┬─────────┘
         │ 1:N                │ 1:N
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  table_joueur   │  │ caracteristique │
├─────────────────┤  ├─────────────────┤
│ id_table (FK)   │  │ id_character(FK)│
│ id_user (FK)    │  │ nom             │
│ role            │  │ valeur          │
└─────────────────┘  └─────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────┐
│     agenda      │
├─────────────────┤
│ id_event (PK)   │
│ id_table (FK)   │
│ titre           │
│ description     │
│ date_heure      │
│ duree           │
│ statut          │
└─────────────────┘
```

### 3.2 Relations principales

- **utilisateur** ↔ **table_de_jeu** : Un utilisateur peut créer plusieurs tables (relation MJ)
- **utilisateur** ↔ **table_joueur** : Un utilisateur peut participer à plusieurs tables
- **utilisateur** ↔ **personnage** : Un utilisateur peut créer plusieurs personnages
- **table_de_jeu** ↔ **personnage** : Un personnage peut être assigné à une table
- **personnage** ↔ **caracteristique** : Un personnage a plusieurs caractéristiques (FOR, DEX, CON, etc.)
- **table_de_jeu** ↔ **agenda** : Une table peut avoir plusieurs événements planifiés

---

## 4. Fonctionnalités réalisées

### 4.1 Authentification et gestion des utilisateurs

**Fonctionnalités :**
- Inscription avec validation
- Connexion sécurisée
- Hachage des mots de passe avec bcryptjs
- Gestion de session via localStorage

**Flux d'authentification :**
```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌──────────┐
│ Login   │─────►│ Renderer │─────►│ Main    │─────►│ MySQL    │
│ Form    │      │ IPC      │      │ Process │      │ Database │
└─────────┘      └──────────┘      └─────────┘      └──────────┘
     │                 │                 │                 │
     │                 │                 │                 │
     │                 │                 │                 │
     └─────────────────┴─────────────────┴─────────────────┘
                    Validation & Hash
```

### 4.2 Gestion des tables de jeu

**Fonctionnalités :**
- Création de tables par les MJ
- Rejoindre une table via code d'invitation
- Visualisation des participants
- Gestion des rôles (MJ/Joueur)
- Expulsion de joueurs (MJ uniquement)
- Suppression de tables (MJ uniquement)

**Flux de création de table :**
```
Utilisateur → Formulaire → Validation → Transaction SQL
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    │ 1. INSERT table_de_jeu            │
                    │ 2. INSERT table_joueur (MJ)        │
                    │ 3. Génération code_invitation      │
                    └───────────────────────────────────┘
```

### 4.3 Gestion des personnages

**Fonctionnalités :**
- Création de personnages avec système de points
- Modification (propriétaire uniquement)
- Suppression (propriétaire uniquement)
- Attribution d'avatar (image)
- Système de caractéristiques avec contraintes :
  - Points 8-12 : coût 1 point
  - Points 13-15 : coût 2 points
  - Maximum : 15
  - Points initiaux : 27

**Système de distribution des points :**
```
┌─────────────────────────────────────┐
│  Points initiaux : 27               │
├─────────────────────────────────────┤
│  FOR  : 8  [−] [+]  (coût: 0)      │
│  DEX  : 8  [−] [+]  (coût: 0)      │
│  CON  : 8  [−] [+]  (coût: 0)      │
│  INT  : 8  [−] [+]  (coût: 0)      │
│  SAG  : 8  [−] [+]  (coût: 0)      │
│  CHA  : 8  [−] [+]  (coût: 0)      │
├─────────────────────────────────────┤
│  Points restants : 27               │
└─────────────────────────────────────┘

Règles :
- 8→12 : 1 point par niveau
- 13→15 : 2 points par niveau
- Maximum : 15
```

### 4.4 Planification (Agenda)

**Fonctionnalités :**
- Création d'événements par le MJ
- Affichage de la prochaine session (la plus proche dans le futur)
- Gestion des dates et durées
- Statuts des sessions

### 4.5 Interface utilisateur

**Design :**
- Thème fantasy avec palette de couleurs médiévales
- Polices Google Fonts (Cinzel, Lora)
- Effets visuels : dégradés, ombres, textures
- Interface responsive
- Animations et transitions

---

## 5. Productions réalisées

### 5.1 Fichiers de code source

**Backend (Processus principal) :**
- `main.js` (744 lignes) : Gestion IPC, requêtes SQL, logique métier
- `preload.js` (46 lignes) : Bridge sécurisé entre processus
- `package.json` : Configuration et dépendances

**Frontend (Renderer) :**
- `renderer.js` (1282 lignes) : Logique client, gestion des formulaires
- `styles.css` (790 lignes) : Feuille de style complète avec thème fantasy

**Pages HTML (10 pages) :**
1. `login.html` - Page de connexion
2. `register.html` - Page d'inscription
3. `dashboard.html` - Tableau de bord principal
4. `create-table.html` - Création de table
5. `join-table.html` - Rejoindre une table
6. `table-view.html` - Détails d'une table
7. `character.html` - Création de personnage
8. `character-edit.html` - Modification de personnage
9. `character-view.html` - Fiche personnage
10. `index.html` - Page d'accueil (redirection)

### 5.2 Fonctionnalités techniques implémentées

**Sécurité :**
- ✅ Hachage bcrypt des mots de passe
- ✅ Context Isolation (Electron)
- ✅ Content Security Policy
- ✅ Validation des permissions (propriétaire uniquement)

**Base de données :**
- ✅ Pool de connexions MySQL
- ✅ Transactions SQL pour opérations complexes
- ✅ Requêtes préparées (protection SQL injection)
- ✅ Gestion des relations (FK, contraintes)

**Interface utilisateur :**
- ✅ Design responsive (mobile/desktop)
- ✅ Thème fantasy cohérent
- ✅ Validation de formulaires en temps réel
- ✅ Feedback visuel (messages, animations)
- ✅ Gestion des erreurs utilisateur

**Logique métier :**
- ✅ Système de points avec contraintes
- ✅ Calcul automatique des points restants
- ✅ Gestion des rôles (MJ/Joueur)
- ✅ Validation des permissions
- ✅ Gestion des codes d'invitation

---

## 6. Schémas explicatifs

### 6.1 Flux de communication IPC

```
┌─────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                      │
│  (Browser - Interface utilisateur)                      │
│                                                          │
│  ┌──────────────┐                                       │
│  │  renderer.js │                                       │
│  │              │                                       │
│  │  window.api. │◄──────┐                              │
│  │  login()     │       │                              │
│  │  createTable()       │                              │
│  │  ...         │       │                              │
│  └──────────────┘       │                              │
│         │               │                              │
│         │               │                              │
│         ▼               │                              │
│  ┌──────────────┐       │                              │
│  │  preload.js  │       │                              │
│  │  (Bridge)    │       │                              │
│  └──────┬───────┘       │                              │
└─────────┼───────────────┼──────────────────────────────┘
          │               │
          │ IPC.invoke    │
          │               │
┌─────────▼───────────────▼──────────────────────────────┐
│                 MAIN PROCESS                           │
│  (Node.js - Logique serveur)                           │
│                                                         │
│  ┌──────────────┐                                      │
│  │  main.js     │                                      │
│  │              │                                      │
│  │  ipcMain.    │                                      │
│  │  handle()    │                                      │
│  │              │                                      │
│  │  - auth:login│                                      │
│  │  - tables:*  │                                      │
│  │  - characters:*                                     │
│  │  - agenda:*  │                                      │
│  └──────┬───────┘                                      │
│         │                                              │
│         ▼                                              │
│  ┌──────────────┐                                      │
│  │  MySQL Pool  │                                      │
│  │  (mysql2)    │                                      │
│  └──────┬───────┘                                      │
└─────────┼──────────────────────────────────────────────┘
          │
          ▼
┌─────────────────┐
│  MySQL Database │
└─────────────────┘
```

### 6.2 Flux de création de personnage

```
┌─────────────────────────────────────────────────────────┐
│  1. UTILISATEUR REMPLIT LE FORMULAIRE                   │
│     - Nom, race, classe, alignement                      │
│     - Distribution des points (FOR, DEX, CON, etc.)     │
│     - Upload avatar (optionnel)                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  2. VALIDATION CLIENT (renderer.js)                     │
│     - Vérification des champs requis                    │
│     - Calcul des points utilisés                        │
│     - Conversion avatar en base64                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  3. ENVOI VIA IPC (preload.js)                         │
│     window.api.createCharacter({                        │
│       id_user, nom, race, classe,                       │
│       abilities, avatarData                             │
│     })                                                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  4. TRAITEMENT SERVEUR (main.js)                       │
│     BEGIN TRANSACTION                                   │
│       INSERT INTO personnage                            │
│       INSERT INTO caracteristique (FOR, DEX, ...)       │
│     COMMIT                                              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  5. RÉPONSE ET REDIRECTION                             │
│     - Message de succès                                 │
│     - Redirection vers dashboard                        │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Architecture des permissions

```
┌─────────────────────────────────────────────────────────┐
│              GESTION DES PERMISSIONS                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │   MAÎTRE DE JEU  │      │     JOUEUR       │        │
│  │   (MJ)           │      │                  │        │
│  ├──────────────────┤      ├──────────────────┤        │
│  │ ✓ Créer table    │      │ ✓ Rejoindre table│        │
│  │ ✓ Supprimer table│      │ ✓ Quitter table  │        │
│  │ ✓ Expulser joueur│      │ ✓ Créer perso    │        │
│  │ ✓ Planifier      │      │ ✓ Modifier perso│        │
│  │   sessions       │      │   (ses propres)  │        │
│  └──────────────────┘      └──────────────────┘        │
│                                                          │
│  Vérification : id_mj === id_user                       │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Points techniques remarquables

### 7.1 Sécurité
- **Isolation des processus** : Context Isolation activé
- **Hachage des mots de passe** : bcryptjs avec salt
- **Protection SQL injection** : Requêtes préparées
- **Validation côté serveur** : Toutes les opérations validées

### 7.2 Performance
- **Pool de connexions** : Réutilisation des connexions MySQL
- **Transactions** : Opérations atomiques pour la cohérence
- **Lazy loading** : Chargement des données à la demande

### 7.3 Expérience utilisateur
- **Interface immersive** : Thème fantasy cohérent
- **Feedback visuel** : Messages d'erreur/succès
- **Validation temps réel** : Calcul des points en direct
- **Responsive design** : Adaptation mobile/desktop

---

## 8. Statistiques du projet

- **Lignes de code** : ~3000+ lignes
- **Pages HTML** : 10 pages
- **Fichiers JavaScript** : 3 fichiers principaux
- **Tables de base de données** : 6 tables
- **Endpoints IPC** : 15+ handlers
- **Fonctionnalités majeures** : 5 modules principaux

---

## 9. Technologies et compétences mises en œuvre

### Compétences techniques
- ✅ Développement Electron (application desktop)
- ✅ Architecture client-serveur avec IPC
- ✅ Base de données relationnelle (MySQL)
- ✅ Sécurité (hachage, isolation, validation)
- ✅ Interface utilisateur moderne (HTML5/CSS3)
- ✅ JavaScript ES6+ (async/await, promesses)
- ✅ Gestion de transactions SQL
- ✅ Design UI/UX

### Outils et méthodes
- ✅ Gestion de version (Git)
- ✅ Configuration environnement (.env)
- ✅ Modularité du code
- ✅ Documentation inline
- ✅ Gestion d'erreurs robuste

---

## 10. Conclusion

Cette application démontre la maîtrise de :
- **Développement full-stack** : Frontend et backend intégrés
- **Architecture moderne** : Electron, IPC, base de données
- **Sécurité** : Bonnes pratiques de sécurité implémentées
- **Design** : Interface utilisateur soignée et immersive
- **Gestion de projet** : Code organisé et maintenable

L'application est fonctionnelle, sécurisée et prête pour un déploiement en environnement de production.
