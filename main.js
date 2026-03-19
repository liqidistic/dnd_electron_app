require("dotenv").config();
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

// ================== MySQL POOL ==================
let pool = null;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "dndapp",
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    });
  }
  return pool;
}

// ================== FENÊTRE PRINCIPALE ==================
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "src", "renderer", "login.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ================== AUTH ==================
ipcMain.handle("auth:login", async (event, { login, password }) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT * FROM utilisateur WHERE login = ?",
      [login]
    );

    if (!rows.length) return { ok: false, error: "Identifiants incorrects." };

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return { ok: false, error: "Identifiants incorrects." };

    delete user.password;
    return { ok: true, user };
  } catch (err) {
    console.error("Erreur auth:login:", err);
    return { ok: false, error: "Erreur serveur lors de la connexion." };
  }
});

ipcMain.handle("auth:register", async (event, payload) => {
  const { login, passwordPlain, pseudo, email } = payload;

  try {
    const pool = getPool();

    if (!login || !passwordPlain) {
      return { ok: false, error: "Login et mot de passe sont obligatoires." };
    }

    const [existing] = await pool.query(
      "SELECT id_user FROM utilisateur WHERE login = ?",
      [login]
    );
    if (existing.length) {
      return { ok: false, error: "Ce login est déjà utilisé." };
    }

    const hash = await bcrypt.hash(passwordPlain, 10);

    const pseudoSafe =
      pseudo && pseudo.trim().length > 0 ? pseudo.trim() : login;
    const emailSafe = email && email.trim().length > 0 ? email.trim() : null;

    const [result] = await pool.query(
      `INSERT INTO utilisateur (login, password, pseudo, email)
       VALUES (?, ?, ?, ?)`,
      [login, hash, pseudoSafe, emailSafe]
    );

    const id_user = result.insertId;
    const user = { id_user, login, pseudo: pseudoSafe, email: emailSafe };

    return { ok: true, user };
  } catch (err) {
    console.error("Erreur auth:register:", err);
    return {
      ok: false,
      error: "Erreur lors de la création du compte : " + err.message,
    };
  }
});

// ================== TABLES ==================
function generateInvitationCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

ipcMain.handle("tables:listForUser", async (event, { id_user }) => {
  try {
    const pool = getPool();

    const [rows] = await pool.query(
      `
      SELECT 
        t.id_table,
        t.nom,
        t.description,
        t.prochaine_session,
        t.code_invitation,
        t.max_joueurs,
        (SELECT COUNT(*) FROM table_joueur tj2 WHERE tj2.id_table = t.id_table) AS nb_joueurs,
        CASE 
          WHEN t.id_mj = ? THEN 'MJ'
          ELSE tj.role
        END AS role
      FROM table_de_jeu t
      LEFT JOIN table_joueur tj
        ON tj.id_table = t.id_table
       AND tj.id_user = ?
      WHERE t.id_mj = ?
         OR tj.id_user = ?
      GROUP BY t.id_table, t.nom, t.description, t.prochaine_session, t.code_invitation, t.max_joueurs, nb_joueurs, role
      ORDER BY t.date_creation DESC
      `,
      [id_user, id_user, id_user, id_user]
    );

    return { ok: true, tables: rows };
  } catch (err) {
    console.error("Erreur tables:listForUser:", err);
    return { ok: false, error: "Erreur serveur (liste des tables)." };
  }
});

ipcMain.handle("tables:create", async (event, payload) => {
  const { id_user, nom, description, max_joueurs, prochaine_session } = payload;

  try {
    const pool = getPool();
    const conn = await pool.getConnection();

    const code_invitation = generateInvitationCode();

    let prochaineSessionSql = null;
    if (prochaine_session) {
      const s = prochaine_session.replace("T", " ");
      prochaineSessionSql = s.length === 16 ? s + ":00" : s;
    }

    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO table_de_jeu
           (nom, description, max_joueurs, prochaine_session, id_mj, code_invitation, date_creation)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          nom,
          description || null,
          max_joueurs || null,
          prochaineSessionSql,
          id_user,
          code_invitation,
        ]
      );

      const id_table = result.insertId;

      await conn.query(
        `INSERT INTO table_joueur (id_table, id_user, role)
         VALUES (?, ?, 'MJ')`,
        [id_table, id_user]
      );

      await conn.commit();
      return { ok: true, id_table, code_invitation };
    } catch (err) {
      await conn.rollback();
      console.error("Erreur tables:create (transaction):", err);
      return { ok: false, error: "Erreur lors de la création de la table." };
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Erreur tables:create:", err);
    return { ok: false, error: "Erreur serveur (tables:create)." };
  }
});

ipcMain.handle("tables:getOne", async (event, { id_table }) => {
  try {
    const pool = getPool();

    const [tables] = await pool.query(
      `SELECT 
         t.*,
         u.pseudo AS mj_pseudo,
         u.login  AS mj_login
       FROM table_de_jeu t
       JOIN utilisateur u ON u.id_user = t.id_mj
       WHERE t.id_table = ?`,
      [id_table]
    );

    if (!tables.length) return { ok: false, error: "Table introuvable." };
    const table = tables[0];

    const [players] = await pool.query(
      `SELECT 
     tj.id_user,
     tj.role,
     u.pseudo,
     u.login,
     GROUP_CONCAT(p.nom ORDER BY p.nom SEPARATOR ', ') AS assigned_character_name
   FROM table_joueur tj
   JOIN utilisateur u ON u.id_user = tj.id_user
   LEFT JOIN personnage p 
     ON p.id_user = tj.id_user
    AND p.id_table = tj.id_table
   WHERE tj.id_table = ?
   GROUP BY tj.id_user, tj.role, u.pseudo, u.login
   ORDER BY 
     CASE WHEN tj.role = 'MJ' THEN 0 ELSE 1 END,
     u.pseudo`,
      [id_table]
    );

    const [events] = await pool.query(
      `SELECT id_event, titre, description, date_heure, duree, statut
       FROM agenda
       WHERE id_table = ?
       ORDER BY date_heure`,
      [id_table]
    );

    const [characters] = await pool.query(
      `SELECT 
         p.id_character,
         p.nom,
         p.classe,
         p.race,
         u.pseudo
       FROM personnage p
       JOIN utilisateur u ON u.id_user = p.id_user
       WHERE p.id_table = ?
       ORDER BY p.nom`,
      [id_table]
    );

    return { ok: true, table, players, events, characters };
  } catch (err) {
    console.error("Erreur tables:getOne:", err);
    return { ok: false, error: "Erreur serveur (détail table)." };
  }
});

ipcMain.handle("tables:join", async (event, { id_user, code }) => {
  try {
    const pool = getPool();

    const cleanCode = (code || "").trim().toUpperCase();
    if (!cleanCode) return { ok: false, error: "Le code est obligatoire." };

    const [rows] = await pool.query(
      "SELECT * FROM table_de_jeu WHERE UPPER(code_invitation) = ?",
      [cleanCode]
    );
    if (!rows.length)
      return { ok: false, error: "Code d'invitation invalide." };

    const table = rows[0];

    const [already] = await pool.query(
      "SELECT * FROM table_joueur WHERE id_table = ? AND id_user = ?",
      [table.id_table, id_user]
    );
    if (already.length)
      return { ok: false, error: "Vous êtes déjà membre de cette table." };

    if (table.max_joueurs !== null) {
      const [count] = await pool.query(
        "SELECT COUNT(*) AS total FROM table_joueur WHERE id_table = ?",
        [table.id_table]
      );
      if (count[0].total >= table.max_joueurs) {
        return { ok: false, error: "Cette table est déjà complète." };
      }
    }

    await pool.query(
      "INSERT INTO table_joueur (id_table, id_user, role) VALUES (?, ?, 'Joueur')",
      [table.id_table, id_user]
    );

    return { ok: true, id_table: table.id_table };
  } catch (err) {
    console.error("Erreur tables:join:", err);
    return {
      ok: false,
      error: "Erreur serveur lors de la connexion à la table : " + err.message,
    };
  }
});

// ===== QUITTER UNE TABLE (joueur) =====
ipcMain.handle("tables:leave", async (event, { id_user, id_table }) => {
  try {
    const pool = getPool();

    const [trows] = await pool.query(
      "SELECT id_table, id_mj FROM table_de_jeu WHERE id_table = ?",
      [id_table]
    );
    if (!trows.length) return { ok: false, error: "Table introuvable." };
    if (Number(trows[0].id_mj) === Number(id_user)) {
      return {
        ok: false,
        error:
          "En tant que MJ, vous ne pouvez pas quitter. Supprimez la table.",
      };
    }

    await pool.query(
      "UPDATE personnage SET id_table = NULL WHERE id_user = ? AND id_table = ?",
      [id_user, id_table]
    );

    const [res] = await pool.query(
      "DELETE FROM table_joueur WHERE id_table = ? AND id_user = ?",
      [id_table, id_user]
    );

    if (res.affectedRows === 0) {
      return { ok: false, error: "Vous n'êtes pas membre de cette table." };
    }

    return { ok: true };
  } catch (err) {
    console.error("Erreur tables:leave:", err);
    return { ok: false, error: "Erreur serveur (quitter la table)." };
  }
});

// ===== SUPPRIMER UNE TABLE (MJ) =====
ipcMain.handle("tables:delete", async (event, { id_user, id_table }) => {
  let conn = null;
  try {
    const pool = getPool();
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [trows] = await conn.query(
      "SELECT id_table, id_mj FROM table_de_jeu WHERE id_table = ?",
      [id_table]
    );
    if (!trows.length) {
      await conn.rollback();
      return { ok: false, error: "Table introuvable." };
    }
    if (Number(trows[0].id_mj) !== Number(id_user)) {
      await conn.rollback();
      return { ok: false, error: "Seul le MJ peut supprimer cette table." };
    }

    await conn.query(
      "UPDATE personnage SET id_table = NULL WHERE id_table = ?",
      [id_table]
    );

    await conn.query("DELETE FROM agenda WHERE id_table = ?", [id_table]);
    await conn.query("DELETE FROM table_joueur WHERE id_table = ?", [id_table]);
    await conn.query("DELETE FROM table_de_jeu WHERE id_table = ?", [id_table]);

    await conn.commit();
    return { ok: true };
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error("Erreur tables:delete:", err);
    return { ok: false, error: "Erreur serveur (suppression table)." };
  } finally {
    if (conn) conn.release();
  }
});

// ===== EXPULSER UN JOUEUR (MJ) =====
ipcMain.handle(
  "tables:kickPlayer",
  async (event, { id_user, id_table, id_target }) => {
    try {
      const pool = getPool();

      // 1) Vérifier table + MJ
      const [trows] = await pool.query(
        "SELECT id_table, id_mj FROM table_de_jeu WHERE id_table = ?",
        [id_table]
      );
      if (!trows.length) return { ok: false, error: "Table introuvable." };

      if (Number(trows[0].id_mj) !== Number(id_user)) {
        return { ok: false, error: "Seul le MJ peut expulser un joueur." };
      }

      // 2) Interdire d’expulser le MJ
      if (Number(id_target) === Number(trows[0].id_mj)) {
        return { ok: false, error: "Impossible d'expulser le MJ." };
      }

      // 3) Vérifier que la cible est bien dans la table
      const [prows] = await pool.query(
        "SELECT role FROM table_joueur WHERE id_table = ? AND id_user = ?",
        [id_table, id_target]
      );
      if (!prows.length) {
        return { ok: false, error: "Ce joueur n'est pas membre de la table." };
      }
      if ((prows[0].role || "").toUpperCase() === "MJ") {
        return { ok: false, error: "Impossible d'expulser un MJ." };
      }

      // 4) Désassigner ses personnages de cette table
      await pool.query(
        "UPDATE personnage SET id_table = NULL WHERE id_user = ? AND id_table = ?",
        [id_target, id_table]
      );

      // 5) Retirer de la table
      const [del] = await pool.query(
        "DELETE FROM table_joueur WHERE id_table = ? AND id_user = ?",
        [id_table, id_target]
      );

      if (del.affectedRows === 0) {
        return { ok: false, error: "Aucune ligne supprimée (déjà retiré ?)." };
      }

      return { ok: true };
    } catch (err) {
      console.error("Erreur tables:kickPlayer:", err);
      return { ok: false, error: "Erreur serveur (expulsion joueur)." };
    }
  }
);

// ================== AGENDA ==================
ipcMain.handle("agenda:create", async (event, payload) => {
  const { id_table, titre, description, date_heure, duree } = payload;

  try {
    const pool = getPool();

    let dateSql = null;
    if (date_heure) {
      const s = date_heure.replace("T", " ");
      dateSql = s.length === 16 ? s + ":00" : s;
    }

    const [result] = await pool.query(
      `INSERT INTO agenda (id_table, titre, description, date_heure, duree, statut)
       VALUES (?, ?, ?, ?, ?, 'prévu')`,
      [id_table, titre || null, description || null, dateSql, duree || null]
    );

    if (dateSql) {
      await pool.query(
        `UPDATE table_de_jeu SET prochaine_session = ? WHERE id_table = ?`,
        [dateSql, id_table]
      );
    }

    return { ok: true, id_event: result.insertId, date_heure: dateSql };
  } catch (err) {
    console.error("Erreur agenda:create:", err);
    return { ok: false, error: "Erreur lors de la création de la session." };
  }
});

// ================== PERSONNAGES ==================
ipcMain.handle("characters:create", async (event, payload) => {
  const {
    id_user,
    id_table,
    nom,
    race,
    classe,
    alignement,
    abilities,
    avatarData,
  } = payload;

  try {
    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO personnage
         (nom, race, classe, niveau, alignement, id_user, id_table, points_vie, experience, avatar)
       VALUES (?, ?, ?, 1, ?, ?, ?, 10, 0, ?)`,
      [
        nom,
        race,
        classe,
        alignement || null,
        id_user,
        id_table || null,
        avatarData || null,
      ]
    );

    const id_character = result.insertId;

    if (abilities && typeof abilities === "object") {
      for (const [nomCarac, valeur] of Object.entries(abilities)) {
        await pool.query(
          "INSERT INTO caracteristique (id_character, nom, valeur) VALUES (?, ?, ?)",
          [id_character, nomCarac, valeur]
        );
      }
    }

    return { ok: true, id_character };
  } catch (err) {
    console.error("Erreur characters:create:", err);
    return { ok: false, error: "Erreur serveur (création personnage)." };
  }
});

ipcMain.handle("characters:listForUser", async (event, { id_user }) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id_character, nom, avatar AS avatarData, id_table
       FROM personnage
       WHERE id_user = ?
       ORDER BY id_character DESC`,
      [id_user]
    );

    return { ok: true, characters: rows };
  } catch (err) {
    console.error("Erreur characters:listForUser:", err);
    return { ok: false, error: "Erreur serveur (liste personnages)." };
  }
});

ipcMain.handle("characters:getOne", async (event, { id_character }) => {
  try {
    const pool = getPool();

    const [chars] = await pool.query(
      `SELECT id_character, id_user, nom, race, classe, alignement, points_vie, experience, avatar AS avatarData
       FROM personnage
       WHERE id_character = ?`,
      [id_character]
    );

    if (!chars.length) return { ok: false, error: "Personnage introuvable." };
    const character = chars[0];

    const [abilitiesRows] = await pool.query(
      "SELECT nom, valeur FROM caracteristique WHERE id_character = ?",
      [id_character]
    );

    const abilities = {};
    for (const row of abilitiesRows) abilities[row.nom] = row.valeur;

    return { ok: true, character: { ...character, abilities } };
  } catch (err) {
    console.error("Erreur characters:getOne:", err);
    return { ok: false, error: "Erreur serveur (fiche personnage)." };
  }
});

ipcMain.handle("characters:update", async (event, payload) => {
  const {
    id_character,
    id_user,
    nom,
    race,
    classe,
    alignement,
    abilities,
    avatarData,
  } = payload;

  try {
    const pool = getPool();

    // Vérifier que le personnage appartient à l'utilisateur
    const [check] = await pool.query(
      "SELECT id_user FROM personnage WHERE id_character = ?",
      [id_character]
    );

    if (!check.length) {
      return { ok: false, error: "Personnage introuvable." };
    }

    if (Number(check[0].id_user) !== Number(id_user)) {
      return { ok: false, error: "Vous n'êtes pas autorisé à modifier ce personnage." };
    }

    // Mettre à jour le personnage
    await pool.query(
      `UPDATE personnage 
       SET nom = ?, race = ?, classe = ?, alignement = ?, avatar = ?
       WHERE id_character = ?`,
      [
        nom,
        race || null,
        classe || null,
        alignement || null,
        avatarData || null,
        id_character,
      ]
    );

    // Supprimer les anciennes caractéristiques
    await pool.query(
      "DELETE FROM caracteristique WHERE id_character = ?",
      [id_character]
    );

    // Ajouter les nouvelles caractéristiques
    if (abilities && typeof abilities === "object") {
      for (const [nomCarac, valeur] of Object.entries(abilities)) {
        await pool.query(
          "INSERT INTO caracteristique (id_character, nom, valeur) VALUES (?, ?, ?)",
          [id_character, nomCarac, valeur]
        );
      }
    }

    return { ok: true, id_character };
  } catch (err) {
    console.error("Erreur characters:update:", err);
    return { ok: false, error: "Erreur serveur (modification personnage)." };
  }
});

ipcMain.handle(
  "characters:delete",
  async (event, { id_character, id_user }) => {
    try {
      const pool = getPool();

      await pool.query("DELETE FROM caracteristique WHERE id_character = ?", [
        id_character,
      ]);

      const [result] = await pool.query(
        "DELETE FROM personnage WHERE id_character = ? AND id_user = ?",
        [id_character, id_user]
      );

      if (result.affectedRows === 0) {
        return {
          ok: false,
          error: "Ce personnage n'existe pas ou ne vous appartient pas.",
        };
      }

      return { ok: true };
    } catch (err) {
      console.error("Erreur characters:delete:", err);
      return { ok: false, error: "Erreur serveur (suppression personnage)." };
    }
  }
);

ipcMain.handle(
  "characters:assignToTable",
  async (event, { id_user, id_character, id_table }) => {
    try {
      const pool = getPool();

      const [chars] = await pool.query(
        "SELECT id_character, id_user, id_table FROM personnage WHERE id_character = ? AND id_user = ?",
        [id_character, id_user]
      );
      if (!chars.length) {
        return {
          ok: false,
          error: "Ce personnage n'existe pas ou ne vous appartient pas.",
        };
      }
      const char = chars[0];

      if (char.id_table && Number(char.id_table) !== Number(id_table)) {
        return {
          ok: false,
          error:
            "Ce personnage est déjà assigné à une autre table. Vous ne pouvez l'utiliser que sur une table à la fois.",
        };
      }

      await pool.query(
        "UPDATE personnage SET id_table = ? WHERE id_character = ?",
        [id_table, id_character]
      );

      return { ok: true };
    } catch (err) {
      console.error("Erreur characters:assignToTable:", err);
      return { ok: false, error: "Erreur serveur (assignation personnage)." };
    }
  }
);
