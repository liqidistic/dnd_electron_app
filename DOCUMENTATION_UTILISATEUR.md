# Documentation utilisateur — DND Manager

Application de bureau pour organiser des **tables de jeu Donjons & Dragons** : comptes joueurs, tables, personnages et agenda des sessions.

---

## 1. Avant de commencer

### Ce dont vous avez besoin

- **MySQL** installé et démarré, avec la base de données créée (voir le script `database/init_dndapp.sql` ou votre propre schéma).
- Un fichier **`.env`** à la racine du projet, avec au minimum :
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`  
  (voir `.env.example`.)

### Lancer l’application

1. Ouvrir un terminal à la racine du projet.
2. Exécuter `npm install` (la première fois).
3. Exécuter `npm start`.

La fenêtre **DND Manager** s’ouvre sur l’écran de **connexion**.

---

## 2. Compte utilisateur

### Se connecter

1. Saisissez votre **login** et votre **mot de passe**.
2. Cliquez sur **Se connecter**.

En cas d’erreur, un message s’affiche sous le formulaire (identifiants incorrects, problème de connexion à la base, etc.).

### Créer un compte

1. Sur l’écran de connexion, cliquez sur **Créer un compte**.
2. Renseignez :
   - **Login** (obligatoire, unique) ;
   - **Pseudo** (facultatif — sinon le login est utilisé) ;
   - **Email** (facultatif) ;
   - **Mot de passe** et **confirmation** (obligatoires, doivent être identiques).
3. Cliquez sur **S’inscrire**.

Après une inscription réussie, vous pouvez vous connecter avec ce login.

### Déconnexion

Sur le **tableau de bord**, cliquez sur **Déconnexion** (en haut à droite). Vous revenez à l’écran de connexion.

---

## 3. Tableau de bord

Après connexion, vous arrivez sur le **tableau de bord**. Deux blocs principaux :

| Zone | Contenu |
|------|---------|
| **Mes tables de jeu** | Liste des tables dont vous êtes membre (en tant que MJ ou joueur). |
| **Personnages** | Liste de vos personnages. |

**Actions possibles :**

- **Créer une table** — vous devenez **maître de jeu (MJ)** de cette table.
- **Rejoindre une table** — saisir le **code d’invitation** fourni par le MJ.
- **Créer un personnage** — ouvrir l’assistant de création.
- Cliquer sur une **table** de la liste pour ouvrir sa **page de détail**.
- Cliquer sur un **personnage** pour ouvrir sa **fiche**.

---

## 4. Tables de jeu

### Créer une table (MJ)

1. Tableau de bord → **Créer une table**.
2. Renseignez :
   - **Nom de la table** (obligatoire) ;
   - **Description** (facultatif) ;
   - **Nombre maximum de joueurs** (facultatif, entre 1 et 10) ;
   - **Prochaine session** (facultatif — date et heure).
3. Validez avec **Créer la table**.

Un **code d’invitation** est généré automatiquement. Vous le retrouvez sur la **page de détail** de la table pour le partager aux joueurs.

### Rejoindre une table (joueur)

1. Tableau de bord → **Rejoindre une table**.
2. Saisissez le **code d’invitation** (lettres et chiffres, sans vous soucier des majuscules/minuscules).
3. Cliquez sur **Rejoindre**.

**Limites :** vous ne pouvez pas rejoindre deux fois la même table ; si un **plafond de joueurs** est défini et atteint, l’inscription est refusée.

### Page de détail d’une table

En ouvrant une table depuis le tableau de bord, vous voyez notamment :

- **Votre rôle** : MJ ou Joueur ;
- **Participants** et effectif (avec limite si elle existe) ;
- **Description**, **MJ**, **date de création** ;
- **Prochaine session** : calculée à partir des événements **futurs** de l’agenda ;
- **Code d’invitation** (à communiquer aux nouveaux joueurs).

#### Liste des joueurs

Pour chaque participant : pseudo, rôle, et **personnage assigné** à cette table s’il y en a un.

- **MJ** : un bouton **Expulser** peut apparaître à côté d’un **joueur** (pas pour le MJ lui-même). L’expulsion retire le joueur de la table et **désassigne** ses personnages de cette table.

#### Agenda

- Tous les membres voient la **liste des sessions** planifiées (titre, date, durée en minutes, statut, description).
- **Seul le MJ** peut **ajouter** une session : titre, date & heure (obligatoire), durée en minutes (par pas de 15), description.

> Lorsqu’une session est créée avec une date, la **prochaine session** affichée en haut peut être mise à jour selon cette date.

#### Personnages de la table

- Liste des personnages **rattachés** à cette table (avec race, classe, joueur).
- Un **lien** sur le nom ouvre la **fiche** du personnage (lecture).

**Assigner un personnage** (tous les membres) :

- Le bloc **« Assigner un de vos personnages à cette table »** propose vos personnages **libres** (non assignés à une autre table).
- Choisissez un personnage dans la liste puis **Assigner à cette table**.

> Un même personnage ne peut être assigné qu’**à une seule table** à la fois. Pour le mettre sur une autre table, il faut d’abord le retirer (quitter la table ou modifier l’assignation côté logique métier — en quittant la table, vos personnages sont désassignés de cette table).

#### Actions de fin de partie

| Qui ? | Action |
|--------|--------|
| **MJ** | **Supprimer la table** — supprime la table, l’agenda et les liens joueurs ; les personnages ne sont pas supprimés mais **ne sont plus assignés** à cette table. |
| **Joueur** (pas MJ) | **Quitter la table** — vous retire de la table et **désassigne** vos personnages de cette table. |

Une confirmation peut vous être demandée avant suppression.

---

## 5. Personnages

### Créer un personnage

1. Tableau de bord → **Créer un personnage**.
2. **Informations de base** : nom (obligatoire), race, classe, alignement (facultatifs).
3. **Table associée** : vous pouvez choisir une table dont vous êtes membre, ou laisser « Aucune table » et assigner plus tard depuis la fiche table.
4. **Avatar** : image facultative (aperçu affiché après sélection).
5. **Caractéristiques** : FOR, DEX, CON, INT, SAG, CHA.  
   Vous disposez de **27 points** à répartir avec les boutons **+** et **-**. Les valeurs de départ sont à **8** ; vous ne pouvez pas dépasser le budget de points ni aller en dessous des règles gérées par l’interface.
6. Validez pour enregistrer.

Le personnage est créé au **niveau 1** avec des valeurs de **points de vie** et **expérience** par défaut définies par l’application.

### Consulter une fiche

Depuis le tableau de bord ou la liste « Personnages de la table », ouvrez un personnage : affichage des infos, caractéristiques et avatar.

### Modifier ou supprimer

Sur la fiche, utilisez **Modifier** ou **Supprimer** selon ce qui est proposé. La suppression est **définitive** pour ce personnage (et ses caractéristiques).

---

## 6. Navigation entre les écrans

La plupart des pages « internes » proposent un bouton du type **Retour au tableau de bord** ou **Retour** pour ne pas rester bloqué.

---

## 7. Données de démonstration (optionnel)

Si vous avez exécuté `database/init_dndapp.sql`, des comptes de test existent (voir `RESSOURCES.md`) : par exemple **`mjdemo`** / **`demo123`**, avec une table et un code d’invitation indiqués dans le script.

---

## 8. Problèmes fréquents

| Problème | Piste de solution |
|----------|-------------------|
| Impossible de se connecter, erreur serveur | Vérifier que **MySQL** tourne, que le **`.env`** est correct et que la base existe. |
| Liste de tables vide | Créer une table ou rejoindre une avec un code valide. |
| Code d’invitation refusé | Vérifier la saisie ; demander au MJ le code à jour. |
| Pas de personnage dans « Assigner » | Créer un personnage ou libérer un personnage déjà sur une autre table. |
| MJ ne peut pas quitter la table | C’est normal : le MJ doit **supprimer** la table s’il veut la fermer. |

---

## 9. Autres documents du projet

| Document | Public |
|----------|--------|
| [README.md](./README.md) | Installation et démarrage rapide |
| [RESSOURCES.md](./RESSOURCES.md) | Technique, base de données, dépendances |
| [DESCRIPTIF_REALISATION.md](./DESCRIPTIF_REALISATION.md) | Contexte de réalisation / architecture |
| [database/init_dndapp.sql](./database/init_dndapp.sql) | Schéma SQL et données de démo |

---

*Document destiné aux utilisateurs finaux de DND Manager. Pour toute évolution de l’interface, mettre à jour ce fichier en conséquence.*
