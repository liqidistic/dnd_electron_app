-- =============================================================================
-- dnd-electron-app — Création de la base MySQL + données de démonstration
-- =============================================================================
-- Usage (ligne de commande) :
--   mysql -u root -p < database/init_dndapp.sql
-- Ou dans MySQL Workbench : ouvrir ce fichier et exécuter tout le script.
--
-- Base par défaut : dndapp (identique à DB_NAME dans .env)
-- ATTENTION : ce script SUPPRIME les tables existantes puis les recrée.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS dndapp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dndapp;

DROP TABLE IF EXISTS caracteristique;
DROP TABLE IF EXISTS agenda;
DROP TABLE IF EXISTS personnage;
DROP TABLE IF EXISTS table_joueur;
DROP TABLE IF EXISTS table_de_jeu;
DROP TABLE IF EXISTS utilisateur;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- Schéma (cohérent avec main.js)
-- -----------------------------------------------------------------------------

CREATE TABLE utilisateur (
  id_user    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  login      VARCHAR(64)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt',
  pseudo     VARCHAR(128) NOT NULL,
  email      VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE table_de_jeu (
  id_table           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom                VARCHAR(255) NOT NULL,
  description        TEXT NULL,
  max_joueurs        INT UNSIGNED NULL,
  prochaine_session  DATETIME NULL,
  id_mj              INT UNSIGNED NOT NULL,
  code_invitation    VARCHAR(32) NOT NULL,
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_table_mj
    FOREIGN KEY (id_mj) REFERENCES utilisateur (id_user)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE table_joueur (
  id_table INT UNSIGNED NOT NULL,
  id_user  INT UNSIGNED NOT NULL,
  role     VARCHAR(20)  NOT NULL COMMENT 'MJ ou Joueur',
  PRIMARY KEY (id_table, id_user),
  CONSTRAINT fk_tj_table
    FOREIGN KEY (id_table) REFERENCES table_de_jeu (id_table)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tj_user
    FOREIGN KEY (id_user) REFERENCES utilisateur (id_user)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE agenda (
  id_event     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_table     INT UNSIGNED NOT NULL,
  titre        VARCHAR(255) NULL,
  description  TEXT NULL,
  date_heure   DATETIME NULL,
  duree        INT UNSIGNED NULL COMMENT 'Durée en minutes',
  statut       VARCHAR(50) NOT NULL DEFAULT 'prévu',
  CONSTRAINT fk_agenda_table
    FOREIGN KEY (id_table) REFERENCES table_de_jeu (id_table)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE personnage (
  id_character INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom          VARCHAR(255) NOT NULL,
  race         VARCHAR(128) NULL,
  classe       VARCHAR(128) NULL,
  alignement   VARCHAR(64)  NULL,
  niveau       INT UNSIGNED NOT NULL DEFAULT 1,
  id_user      INT UNSIGNED NOT NULL,
  id_table     INT UNSIGNED NULL,
  points_vie   INT NOT NULL DEFAULT 10,
  experience   INT NOT NULL DEFAULT 0,
  avatar       LONGTEXT NULL COMMENT 'Image base64 optionnelle',
  CONSTRAINT fk_perso_user
    FOREIGN KEY (id_user) REFERENCES utilisateur (id_user)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_perso_table
    FOREIGN KEY (id_table) REFERENCES table_de_jeu (id_table)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE caracteristique (
  id_carac     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_character INT UNSIGNED NOT NULL,
  nom          VARCHAR(20) NOT NULL,
  valeur       INT NOT NULL,
  CONSTRAINT fk_carac_perso
    FOREIGN KEY (id_character) REFERENCES personnage (id_character)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_carac_character (id_character)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Données de démonstration
-- Mots de passe : demo123 (tous les comptes ci-dessous)
-- Hash généré avec bcryptjs, cost 10
-- -----------------------------------------------------------------------------

INSERT INTO utilisateur (id_user, login, password, pseudo, email) VALUES
  (1, 'mjdemo',
   '$2a$10$S0MKleJX7EXQI8kmJwvDyuL/wy4y//J7n9nq0V7lxGMy0yPudLNcu',
   'Aldric le Maître', 'aldric@example.com'),
  (2, 'joueur1',
   '$2a$10$S0MKleJX7EXQI8kmJwvDyuL/wy4y//J7n9nq0V7lxGMy0yPudLNcu',
   'Lyra Ombreclair', 'lyra@example.com'),
  (3, 'joueur2',
   '$2a$10$S0MKleJX7EXQI8kmJwvDyuL/wy4y//J7n9nq0V7lxGMy0yPudLNcu',
   'Thorin Marteaudefer', 'thorin@example.com');

INSERT INTO table_de_jeu (
  id_table, nom, description, max_joueurs, prochaine_session,
  id_mj, code_invitation, date_creation
) VALUES (
  1,
  'La taverne des commencements',
  'Campagne introduction : mystères autour du village de Brumeval. Niveaux 1–3.',
  6,
  '2026-04-12 20:00:00',
  1,
  'DEMO2026',
  '2026-03-01 10:00:00'
);

INSERT INTO table_joueur (id_table, id_user, role) VALUES
  (1, 1, 'MJ'),
  (1, 2, 'Joueur'),
  (1, 3, 'Joueur');

INSERT INTO agenda (id_table, titre, description, date_heure, duree, statut) VALUES
  (1, 'Session 0 — création des liens', 'Rencontre à la taverne, hooks de campagne.', '2026-04-12 20:00:00', 180, 'prévu'),
  (1, 'Donjon des rats géants', 'Premier repaire sous la ville.', '2026-04-26 20:00:00', 240, 'prévu');

INSERT INTO personnage (
  id_character, nom, race, classe, alignement, niveau,
  id_user, id_table, points_vie, experience, avatar
) VALUES
  (1, 'Sylenna', 'Elfe', 'Rôdeuse', 'Neutre bon', 1, 2, 1, 11, 0, NULL),
  (2, 'Grok le Bref', 'Halfelin', 'Barde', 'Chaotique bon', 1, 3, 1, 9, 50, NULL),
  (3, 'NPC — Capitaine Harn', 'Humain', 'Guerrier', 'Loyal neutre', 3, 1, 1, 28, 0, NULL);

INSERT INTO caracteristique (id_character, nom, valeur) VALUES
  (1, 'FOR', 12), (1, 'DEX', 16), (1, 'CON', 13), (1, 'INT', 10), (1, 'SAG', 14), (1, 'CHA', 8),
  (2, 'FOR', 8),  (2, 'DEX', 14), (2, 'CON', 12), (2, 'INT', 10), (2, 'SAG', 10), (2, 'CHA', 16),
  (3, 'FOR', 16), (3, 'DEX', 12), (3, 'CON', 15), (3, 'INT', 10), (3, 'SAG', 11), (3, 'CHA', 10);

-- Réaligner les AUTO_INCREMENT après inserts avec IDs fixes
ALTER TABLE utilisateur AUTO_INCREMENT = 10;
ALTER TABLE table_de_jeu AUTO_INCREMENT = 10;
ALTER TABLE agenda AUTO_INCREMENT = 10;
ALTER TABLE personnage AUTO_INCREMENT = 10;
ALTER TABLE caracteristique AUTO_INCREMENT = 100;

-- =============================================================================
-- Récapitulatif connexion application
--   mjdemo   / demo123  — MJ de la table « La taverne des commencements »
--   joueur1  / demo123  — joueuse Lyra, perso Sylenna sur la table 1
--   joueur2  / demo123  — joueur Thorin, perso Grok sur la table 1
-- Code d'invitation de la table : DEMO2026
-- =============================================================================
