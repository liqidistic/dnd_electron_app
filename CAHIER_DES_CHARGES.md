# Cahier des charges — DND Manager

**Type de document :** cahier des charges **descriptif** (aligné sur la livraison réelle du projet).  
**Produit livré :** application desktop **DND Manager** — gestion de tables de jeu Donjons & Dragons.  
**Périmètre :** fonctionnalités, contraintes techniques et règles métier **effectivement implémentées** au moment de la rédaction.

---

## 1. Contexte et besoin métier

### 1.1 Contexte

Les joueurs et maîtres de jeu (MJ) ont besoin d’un outil centralisé pour **organiser des tables D&D**, gérer des **comptes utilisateurs**, des **fiches de personnages** et **planifier les sessions**. La solution retenue est une **application de bureau multiplateforme** (Electron) connectée à une **base MySQL** relationnelle.

### 1.2 Objectifs du projet

| Objectif | Réalisation |
|----------|------------|
| Authentification des utilisateurs | Inscription, connexion, déconnexion ; session côté client (localStorage) |
| Gestion des tables | Création (MJ), rejoindre par code, détail table, rôles MJ/Joueur, limites d’effectif |
| Gestion des personnages | Création, consultation, modification, suppression (propriétaire) ; avatar ; caractéristiques avec budget de points |
| Planification | Agenda par table ; prochaine session calculée sur événements futurs |
| Expérience utilisateur | Interface thème fantasy, responsive, navigation avec retours tableau de bord |

---

## 2. Périmètre fonctionnel (exigences réalisées)

### 2.1 Comptes et authentification

- **Inscription :** login obligatoire et unique ; pseudo et email facultatifs ; mot de passe + confirmation.
- **Connexion :** login et mot de passe ; messages d’erreur explicites (identifiants, base indisponible, etc.).
- **Déconnexion :** depuis le tableau de bord.
- **Sécurité mot de passe :** hachage avec **bcryptjs** côté processus principal.

### 2.2 Tableau de bord

- Affichage des **tables** dont l’utilisateur est membre (MJ ou joueur).
- Affichage des **personnages** de l’utilisateur.
- Accès aux flux : créer table, rejoingre table, créer personnage ; ouverture du détail table ou de la fiche personnage.

### 2.3 Tables de jeu

- **Création (MJ) :** nom obligatoire ; description facultative ; nombre max de joueurs facultatif (plage 1–10) ; prochaine session facultative (date/heure). Génération automatique d’un **code d’invitation**.
- **Rejoindre (joueur) :** saisie du code (insensible à la casse) ; impossible de rejoindre deux fois la même table ; refus si plafond atteint.
- **Page détail :** rôle courant, participants, effectif / limite, description, MJ, date de création, **prochaine session**, code d’invitation, personnages rattachés.
- **Participants :** affichage pseudo, rôle, personnage assigné le cas échéant.
- **MJ — expulsion :** retrait d’un joueur (pas soi-même) ; **désassignation** des personnages de ce joueur pour cette table.
- **Fin de partie :**
  - **MJ :** suppression de la table (avec confirmation) ; suppression des liens et de l’agenda ; personnages conservés mais plus assignés à cette table.
  - **Joueur (non MJ) :** quitter la table ; désassignation de ses personnages pour cette table.
- **Règle UX :** le MJ ne « quitte » pas la table comme un joueur ; il doit **supprimer** la table pour la fermer.

### 2.4 Personnages

- **Création :** nom obligatoire ; race, classe, alignement facultatifs ; table associée facultative ou « aucune » puis assignation ultérieure ; avatar image facultatif ; six caractéristiques (FOR, DEX, CON, INT, SAG, CHA).
- **Règles de points (interface) :** budget **27 points** ; valeurs de départ **8** ; plafond **15** par caractéristique ; coût **1 point** par incrément pour 8→12, **2 points** pour 13→15 (conformément à la logique documentée dans le projet).
- **Niveau / PV / XP :** personnage créé au **niveau 1** avec valeurs par défaut définies par l’application.
- **Consultation :** fiche lecture avec infos, caractéristiques, avatar.
- **Modification / suppression :** **propriétaire uniquement** ; suppression définitive du personnage et de ses caractéristiques en base.

### 2.5 Assignation personnage ↔ table

- Depuis la fiche table : liste des personnages **libres** de l’utilisateur (non assignés à une autre table) ; assignation à la table courante.
- **Un personnage** ne peut être assigné qu’**à une seule table** à la fois.
- Désassignation implicite lors d’expulsion, départ joueur ou suppression de table (comportement documenté).

### 2.6 Agenda (sessions)

- **Lecture :** tous les membres voient la liste des sessions (titre, date, durée en minutes, statut, description).
- **Création :** **MJ uniquement** ; titre ; date et heure obligatoires ; durée en **pas de 15 minutes** ; description facultative.
- **Prochaine session affichée :** dérivée des événements **futurs** de l’agenda.

---

## 3. Exigences non fonctionnelles (réalisées)

| Domaine | Exigence livrée |
|---------|-----------------|
| Plateforme | Application **Electron** (processus principal Node + renderer navigateur) |
| Données persistantes | **MySQL** / MariaDB ; schéma et script d’initialisation `database/init_dndapp.sql` |
| Configuration | Variables d’environnement (`.env`) : `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (réf. `.env.example`) |
| Sécurité applicative | **Context isolation** ; pont **preload** ; requêtes **préparées** ; validation des permissions côté serveur (MJ, propriétaire personnage) |
| Robustesse | **Pool de connexions** ; **transactions** pour opérations multi-écritures ; gestion d’erreurs et retours utilisateur |
| Interface | **HTML5 / CSS3 / JavaScript ES6+** ; thème fantasy (polices Cinzel, Lora, etc.) ; mise en page **responsive** |
| Déploiement dev | `npm install`, `npm start` après création de la base et configuration `.env` |

---

## 4. Architecture et stack (cible atteinte)

- **Client (renderer) :** pages HTML, `renderer.js` (formulaires, validation, appels API exposée par preload), `styles.css`.
- **Pont :** `preload.js` expose une API sécurisée vers le processus principal.
- **Serveur local (main) :** `main.js` — handlers **IPC**, logique d’accès données, SQL.
- **Persistance :** six tables relationnelles principales : `utilisateur`, `table_de_jeu`, `table_joueur`, `personnage`, `caracteristique`, `agenda`.

*(Le détail des relations et schémas logiques figure dans [DESCRIPTIF_REALISATION.md](./DESCRIPTIF_REALISATION.md).)*

### 4.1 Dépendances principales (référence)

- **electron** ^39.1.2  
- **mysql2** ^3.15.3  
- **bcryptjs** ^2.4.3  
- **dotenv** ^16.6.1  

---

## 5. Livrables concrets

| Livrable | Description |
|----------|-------------|
| Code source | `main.js`, `preload.js`, `renderer.js`, feuilles de style, **10 pages HTML** (login, register, dashboard, create/join table, table view, character create/edit/view, index/redirection) |
| Base de données | Script SQL d’init + schéma ; jeu de démo optionnel (comptes et table titre **DEMO2026** selon documentation projet) |
| Documentation | README, guide utilisateur, ressources, descriptif de réalisation |
| Exécution | Lancement via Electron après installation npm et MySQL opérationnel |

---

## 6. Données de test

Le script `database/init_dndapp.sql` peut fournir des comptes de démonstration (ex. `mjdemo`, `joueur1`, `joueur2`, mot de passe documenté **`demo123`**) — à utiliser uniquement en environnement de test.

---

## 7. Critères de conformité

La version est conforme à ce cahier des charges si :

1. Un utilisateur peut **s’inscrire**, **se connecter** et **se déconnecter** ; les mots de passe sont stockés hachés.
2. Un MJ peut **créer** une table, obtenir un **code d’invitation**, et des joueurs peuvent **rejoindre** dans les limites définies.
3. Les **règles MJ / Joueur** (expulsion, agenda réservé au MJ, suppression table vs quitter table) sont respectées.
4. Les **personnages** peuvent être créés avec le **système de 27 points** et les contraintes d’interface, puis consultés / modifiés / supprimés par leur propriétaire.
5. L’**assignation** personnage-table respecte l’unicité d’assignation et les désassignations sur les événements documentés.
6. L’application **démarre** avec une base MySQL correctement initialisée et un `.env` valide.
