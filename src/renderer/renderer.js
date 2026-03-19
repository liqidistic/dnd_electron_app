/* ================== UTIL / AUTH ================== */
function requireLogin() {
  const userStr = localStorage.getItem("dndUser");
  if (!userStr) {
    window.location.href = "login.html";
    return null;
  }
  try {
    return JSON.parse(userStr);
  } catch {
    window.location.href = "login.html";
    return null;
  }
}

/* ================== DASHBOARD : TABLES ================== */
async function loadTablesForCurrentUser() {
  const listEl = document.getElementById("tables-list");
  const emptyEl = document.getElementById("tables-empty");
  if (!listEl || !emptyEl) return;

  const user = requireLogin();
  if (!user) return;

  emptyEl.textContent = "Chargement de vos tables...";
  listEl.innerHTML = "";

  const res = await window.api.listTablesForUser(user.id_user);
  if (!res.ok) {
    emptyEl.textContent = res.error || "Impossible de charger les tables.";
    return;
  }

  const tables = res.tables || [];
  if (!tables.length) {
    emptyEl.textContent = "Vous n'êtes inscrit à aucune table.";
    return;
  }

  emptyEl.textContent = "";
  listEl.innerHTML = tables
    .map((t) => {
      const dateStr = t.prochaine_session
        ? new Date(t.prochaine_session).toLocaleString()
        : "Non planifiée";

      const code = t.code_invitation || "—";
      const nb = t.nb_joueurs != null ? Number(t.nb_joueurs) : 0;
      const max = t.max_joueurs != null ? Number(t.max_joueurs) : null;
      const cap = max ? `${nb} / ${max} joueurs` : `${nb} joueur(s)`;

      return `
        <li class="table-item" data-id="${t.id_table}">
          <div class="table-main">
            <strong>${t.nom}</strong>
            <span class="badge-role">${t.role || ""}</span>
          </div>
          <div class="table-meta">
            <span class="muted">${cap}</span><br/>
            ${t.description || "Aucune description"}<br/>
            <span class="table-date">Prochaine session : ${dateStr}</span><br/>
            <span class="table-code">
              Code d'invitation : <strong>${code}</strong>
            </span>
          </div>
        </li>
      `;
    })
    .join("");

  // Ouvrir la table
  listEl.addEventListener("click", (e) => {
    const item = e.target.closest(".table-item");
    if (!item) return;

    const id = item.dataset.id;
    if (!id) return;

    localStorage.setItem("selectedTableId", id);
    window.location.href = "table-view.html";
  });
}

/* ================== DASHBOARD : PERSONNAGES ================== */
async function loadCharactersForDashboard() {
  const container = document.getElementById("characters-list");
  const emptyEl = document.getElementById("characters-empty");
  if (!container || !emptyEl) return;

  const user = requireLogin();
  if (!user) return;

  emptyEl.textContent = "Chargement de vos personnages...";
  container.innerHTML = "";

  const res = await window.api.listCharactersForUser(user.id_user);
  if (!res.ok) {
    emptyEl.textContent = res.error || "Impossible de charger les personnages.";
    return;
  }

  const chars = res.characters || [];
  if (!chars.length) {
    emptyEl.textContent = "Vous n'avez pas encore créé de personnage.";
    return;
  }

  emptyEl.textContent = "";
  container.innerHTML = chars
    .map((c) => {
      const initial = c.nom ? c.nom.charAt(0).toUpperCase() : "?";
      return `
        <div class="char-card" data-id="${c.id_character}">
          <div class="char-avatar">
            ${
              c.avatarData
                ? `<img src="${c.avatarData}" alt="${c.nom}">`
                : `<div class="char-avatar-placeholder">${initial}</div>`
            }
          </div>
          <div class="char-name">${c.nom}</div>
        </div>
      `;
    })
    .join("");

  // ✅ clic => fiche perso
  container.querySelectorAll(".char-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      if (!id) return;
      localStorage.setItem("selectedCharacterId", String(id));
      window.location.href = "character-view.html";
    });
  });
}

/* ================== ASSIGNATION PERSO -> TABLE ================== */
async function setupAssignCharacterSection(id_table) {
  const container = document.getElementById("assign-char-inner");
  if (!container) return;

  const user = requireLogin();
  if (!user) return;

  container.innerHTML = `<p class="muted">Chargement de vos personnages...</p>`;

  const res = await window.api.listCharactersForUser(user.id_user);
  if (!res.ok) {
    container.innerHTML = `<p class="message error">${
      res.error || "Impossible de charger vos personnages."
    }</p>`;
    return;
  }

  const allChars = res.characters || [];

  // libres ou déjà sur cette table
  const chars = allChars.filter((c) => {
    if (c.id_table == null) return true;
    return Number(c.id_table) === Number(id_table);
  });

  if (!chars.length) {
    container.innerHTML = `<p class="muted">Vous n'avez aucun personnage libre à assigner.</p>`;
    return;
  }

  const options = chars
    .map((c) => `<option value="${c.id_character}">${c.nom}</option>`)
    .join("");

  container.innerHTML = `
    <label>
      Sélectionner un personnage
      <select id="assign-char-select">
        <option value="">-- Choisissez un personnage --</option>
        ${options}
      </select>
    </label>
    <button id="btn-assign-char" class="primary-btn">Assigner à cette table</button>
    <p id="assign-char-message" class="message"></p>
  `;

  document
    .getElementById("btn-assign-char")
    .addEventListener("click", async () => {
      const select = document.getElementById("assign-char-select");
      const msg = document.getElementById("assign-char-message");
      msg.textContent = "";
      msg.className = "message";

      const id_character = Number(select.value);
      if (!id_character) {
        msg.textContent = "Veuillez choisir un personnage.";
        msg.classList.add("error");
        return;
      }

      const r = await window.api.assignCharacterToTable({
        id_user: user.id_user,
        id_character,
        id_table,
      });

      if (!r.ok) {
        msg.textContent = r.error || "Impossible d'assigner le personnage.";
        msg.classList.add("error");
        return;
      }

      msg.textContent = "Personnage assigné à la table.";
      msg.classList.add("success");
      setTimeout(() => loadTableView(), 400);
    });
}

/* ================== AGENDA : FORM ================== */
function setupAgendaForm(id_table) {
  const form = document.getElementById("agenda-form");
  const msg = document.getElementById("agenda-message");
  if (!form || !msg) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "message";

    const titre = document.getElementById("agenda-title").value.trim();
    const description = document.getElementById("agenda-desc").value.trim();
    const dateStr = document.getElementById("agenda-date").value;
    const dureeStr = document.getElementById("agenda-duration").value;

    if (!dateStr) {
      msg.textContent = "La date/heure est obligatoire.";
      msg.classList.add("error");
      return;
    }

    const duree = dureeStr ? parseInt(dureeStr, 10) : null;

    const res = await window.api.createAgendaEvent({
      id_table,
      titre,
      description,
      date_heure: dateStr,
      duree,
    });

    if (!res.ok) {
      msg.textContent = res.error || "Impossible de créer la session.";
      msg.classList.add("error");
      return;
    }

    msg.textContent = "Session ajoutée à l'agenda.";
    msg.classList.add("success");
    setTimeout(() => loadTableView(), 500);
  });
}

/* ================== FICHE TABLE ================== */
async function loadTableView() {
  const root = document.getElementById("table-view-root");
  const msg = document.getElementById("table-view-message");
  const titleEl = document.getElementById("table-title");
  if (!root || !msg || !titleEl) return;

  const user = requireLogin();
  if (!user) return;

  const idStr = localStorage.getItem("selectedTableId");
  const id_table = Number(idStr);
  if (!id_table) {
    msg.textContent = "Aucune table sélectionnée.";
    msg.className = "message error";
    return;
  }

  msg.textContent = "Chargement de la table...";
  msg.className = "message";
  root.innerHTML = "";

  const res = await window.api.getTable(id_table);
  if (!res.ok) {
    msg.textContent = res.error || "Impossible de charger la table.";
    msg.classList.add("error");
    return;
  }

  const { table, players, events, characters } = res;
  titleEl.textContent = `Table : ${table.nom}`;

  const dateCreation = table.date_creation
    ? new Date(table.date_creation).toLocaleString()
    : "Inconnue";

  const nb = players ? players.length : 0;
  const max = table.max_joueurs != null ? Number(table.max_joueurs) : null;
  const cap = max ? `${nb} / ${max} joueurs` : `${nb} joueur(s)`;

  const isMj = Number(table.id_mj) === Number(user.id_user);
  const myRow = (players || []).find(
    (p) => Number(p.id_user) === Number(user.id_user)
  );
  const myRole = isMj ? "MJ" : myRow?.role || "Joueur";

  // prochaine session (la plus proche dans le futur)
  let prochaineSessionStr = null;
  if (events && events.length) {
    const now = new Date();
    let nextEvent = null;
    let minTimeDiff = Infinity;
    
    for (const ev of events) {
      if (!ev.date_heure) continue;
      const d = new Date(ev.date_heure);
      
      // Ignorer les sessions passées
      if (d < now) continue;
      
      // Calculer la différence de temps avec maintenant
      const timeDiff = d.getTime() - now.getTime();
      
      // Garder la session la plus proche dans le futur
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        nextEvent = ev;
      }
    }
    
    // Si on a trouvé une session future, formater l'affichage
    if (nextEvent) {
      const dStr = nextEvent.date_heure
        ? new Date(nextEvent.date_heure).toLocaleString()
        : "Date inconnue";
      const note = nextEvent.description || "";
      const titre = nextEvent.titre || "Session";
      prochaineSessionStr = titre + " — " + dStr + (note ? " — " + note : "");
    }
    // Si aucune session future n'existe, prochaineSessionStr reste null
  }

  // joueurs (avec perso affiché si ton API le renvoie déjà)
  const playersHtml =
    players && players.length
      ? `<ul class="players-list">
        ${players
          .map((p) => {
            const isTargetMj = (p.role || "").toUpperCase() === "MJ";
            const canKick =
              isMj && !isTargetMj && Number(p.id_user) !== Number(user.id_user);

            const perso = p.assigned_character_name
              ? `— Personnage : <strong>${p.assigned_character_name}</strong>`
              : `— <span class="muted">Aucun personnage assigné</span>`;

            return `
              <li class="player-row">
                <div class="player-left">
                  <div class="player-line1">
                    <strong>${p.pseudo}</strong> <span class="muted">(${
              p.role
            })</span>
                  </div>
                  <div class="player-line2">${perso}</div>
                </div>
                <div class="player-right">
                  ${
                    canKick
                      ? `<button class="danger-btn danger-btn--small btn-kick-player" data-target="${p.id_user}">
                          Expulser
                        </button>`
                      : ""
                  }
                </div>
              </li>
            `;
          })
          .join("")}
      </ul>`
      : "<p>Aucun joueur inscrit pour le moment.</p>";

  // agenda
  const eventsHtml =
    events && events.length
      ? "<ul>" +
        events
          .map((ev) => {
            const dateEv = ev.date_heure
              ? new Date(ev.date_heure).toLocaleString()
              : "Date inconnue";
            const duree =
              ev.duree != null ? `${ev.duree} min` : "Durée inconnue";
            return `<li>
              <strong>${ev.titre || "Session"}</strong> — ${dateEv}
              <br><span class="muted">${duree} • ${ev.statut}${
              ev.description ? " — " + ev.description : ""
            }</span>
            </li>`;
          })
          .join("") +
        "</ul>"
      : "<p>Aucune session planifiée dans l'agenda.</p>";

  const agendaFormHtml = isMj
    ? `
      <h3>Planifier une nouvelle session</h3>
      <form id="agenda-form">
        <label>Titre <input type="text" id="agenda-title" placeholder="Session 3 : La crypte" /></label>
        <label>Date & heure <input type="datetime-local" id="agenda-date" required /></label>
        <label>Durée (min) <input type="number" id="agenda-duration" min="15" step="15" placeholder="180" /></label>
        <label>Description <textarea id="agenda-desc" rows="2" placeholder="Petite note."></textarea></label>
        <button type="submit">Ajouter à l'agenda</button>
      </form>
      <p id="agenda-message" class="message"></p>
    `
    : `<p class="muted">Seul le MJ peut planifier de nouvelles sessions.</p>`;

  // personnages de la table
  const charsHtml =
    characters && characters.length
      ? `<ul class="table-chars-list">
          ${characters
            .map(
              (c) => `
                <li>
                  <a href="#" class="table-char-link" data-char-id="${
                    c.id_character
                  }">
                    <strong>${c.nom}</strong>
                  </a>
                  — ${c.race || "?"} ${c.classe || ""}
                  <span class="muted">(joué par ${c.pseudo})</span>
                </li>`
            )
            .join("")}
        </ul>`
      : "<p>Aucun personnage encore rattaché à cette table.</p>";

  const actionsHtml = isMj
    ? `<button id="btn-delete-table" class="danger-btn danger-btn--wide">Supprimer la table</button>`
    : `<button id="btn-leave-table" class="danger-btn danger-btn--wide">Quitter la table</button>`;

  const assignHtml = `
    <div class="assign-char">
      <h3>Assigner un de vos personnages à cette table</h3>
      <div id="assign-char-inner"><p class="muted">Chargement...</p></div>
    </div>
  `;

  root.innerHTML = `
    <section class="table-section">
      <h2>Informations générales</h2>
      <p><strong>Votre rôle :</strong> ${myRole}</p>
      <p><strong>Participants :</strong> ${cap}</p>
      <p>${table.description || "Aucune description."}</p>
      <p><strong>MJ :</strong> ${table.mj_pseudo}</p>
      <p><strong>Créée le :</strong> ${dateCreation}</p>
      ${prochaineSessionStr ? `<p><strong>Prochaine session :</strong> ${prochaineSessionStr}</p>` : ''}
      <p><strong>Code d'invitation :</strong> ${
        table.code_invitation || "—"
      }</p>
      <div style="margin-top:12px;">${actionsHtml}</div>
      <p id="table-action-message" class="message"></p>
    </section>

    <section class="table-section">
      <h2>Joueurs</h2>
      ${playersHtml}
    </section>

    <section class="table-section">
      <h2>Agenda</h2>
      ${eventsHtml}
      ${agendaFormHtml}
    </section>

    <section class="table-section">
      <h2>Personnages de la table</h2>
      ${charsHtml}
      ${assignHtml}
    </section>
  `;

  msg.textContent = "";
  msg.className = "message";

  // clic vers fiche perso depuis "Personnages de la table"
  root.querySelectorAll(".table-char-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const id_character = Number(link.dataset.charId);
      if (!id_character) return;
      localStorage.setItem("selectedCharacterId", String(id_character));
      window.location.href = "character-view.html";
    });
  });

  const actionMsg = document.getElementById("table-action-message");

  // delete / leave
  if (isMj) {
    document
      .getElementById("btn-delete-table")
      ?.addEventListener("click", async () => {
        const ok = window.confirm(
          "Supprimer la table ? (agenda, participants). Les personnages seront désassignés."
        );
        if (!ok) return;

        actionMsg.textContent = "Suppression en cours...";
        actionMsg.className = "message";

        const r = await window.api.deleteTable({
          id_user: user.id_user,
          id_table,
        });
        if (!r.ok) {
          actionMsg.textContent =
            r.error || "Impossible de supprimer la table.";
          actionMsg.classList.add("error");
          return;
        }

        actionMsg.textContent = "Table supprimée.";
        actionMsg.classList.add("success");
        setTimeout(() => (window.location.href = "dashboard.html"), 600);
      });

    setupAgendaForm(id_table);

    // expulser joueur
    root.querySelectorAll(".btn-kick-player").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id_target = Number(btn.dataset.target);
        if (!id_target) return;

        const ok = window.confirm(
          "Expulser ce joueur ? Ses personnages seront désassignés."
        );
        if (!ok) return;

        actionMsg.textContent = "Expulsion en cours...";
        actionMsg.className = "message";

        const r = await window.api.kickPlayer({
          id_user: user.id_user,
          id_table,
          id_target,
        });
        if (!r.ok) {
          actionMsg.textContent = r.error || "Impossible d'expulser le joueur.";
          actionMsg.classList.add("error");
          return;
        }

        actionMsg.textContent = "Joueur expulsé.";
        actionMsg.classList.add("success");
        setTimeout(() => loadTableView(), 400);
      });
    });
  } else {
    document
      .getElementById("btn-leave-table")
      ?.addEventListener("click", async () => {
        const ok = window.confirm(
          "Quitter la table ? Vos personnages sur cette table seront désassignés."
        );
        if (!ok) return;

        actionMsg.textContent = "Départ en cours...";
        actionMsg.className = "message";

        const r = await window.api.leaveTable({
          id_user: user.id_user,
          id_table,
        });
        if (!r.ok) {
          actionMsg.textContent = r.error || "Impossible de quitter la table.";
          actionMsg.classList.add("error");
          return;
        }

        actionMsg.textContent = "Vous avez quitté la table.";
        actionMsg.classList.add("success");
        setTimeout(() => (window.location.href = "dashboard.html"), 600);
      });
  }

  setupAssignCharacterSection(id_table);
}

/* ================== FICHE PERSONNAGE ================== */
async function loadCharacterView() {
  const root = document.getElementById("character-view-root");
  const msg = document.getElementById("char-view-message");
  if (!root || !msg) return;

  const user = requireLogin();
  if (!user) return;

  const idStr = localStorage.getItem("selectedCharacterId");
  const id_character = Number(idStr);
  if (!id_character) {
    msg.textContent = "Aucun personnage sélectionné.";
    msg.className = "message error";
    return;
  }

  msg.textContent = "Chargement du personnage...";
  msg.className = "message";
  root.innerHTML = "";

  const res = await window.api.getCharacter(id_character);
  if (!res.ok) {
    msg.textContent = res.error || "Impossible de charger la fiche.";
    msg.classList.add("error");
    return;
  }

  const c = res.character || {};
  const a = c.abilities || {};
  
  // Vérifier si l'utilisateur est le propriétaire
  const isOwner = Number(c.id_user) === Number(user.id_user);
  
  console.log("Character data:", c);
  console.log("User ID:", user.id_user);
  console.log("Character owner ID:", c.id_user);
  console.log("Is owner:", isOwner);

  root.innerHTML = `
    <h2>${c.nom || "Sans nom"}</h2>
    ${
      c.avatarData
        ? `<div class="avatar-preview"><img src="${c.avatarData}" alt=""></div>`
        : ""
    }
    <p><strong>Race :</strong> ${c.race || "-"}</p>
    <p><strong>Classe :</strong> ${c.classe || "-"}</p>
    <p><strong>Niveau :</strong> ${c.niveau ?? "-"}</p>

    <h3>Caractéristiques</h3>
    ${
      Object.keys(a).length
        ? `<ul>${Object.entries(a)
            .map(([k, v]) => `<li><strong>${k}</strong> : ${v}</li>`)
            .join("")}</ul>`
        : `<p class="muted">Aucune caractéristique trouvée.</p>`
    }
  `;

  msg.textContent = "";
  msg.className = "message";

  // Afficher/masquer les boutons d'action (uniquement pour le propriétaire)
  const actionsContainer = document.getElementById("character-actions");
  const btnEdit = document.getElementById("btn-edit-character");
  const btnDelete = document.getElementById("btn-delete-character");
  
  console.log("Character data:", c);
  console.log("User ID:", user.id_user, typeof user.id_user);
  console.log("Character owner ID:", c.id_user, typeof c.id_user);
  console.log("Is owner:", isOwner);
  console.log("Actions container:", actionsContainer);
  console.log("Edit button:", btnEdit);
  console.log("Delete button:", btnDelete);
  
  if (isOwner && actionsContainer && btnEdit && btnDelete) {
    console.log("Showing action buttons for owner");
    actionsContainer.style.display = "flex";
    
    // Bouton Modifier
    btnEdit.onclick = () => {
      localStorage.setItem("editingCharacterId", String(id_character));
      window.location.href = "character-edit.html";
    };
    
    // Bouton Supprimer
    btnDelete.onclick = async () => {
      const ok = window.confirm("Supprimer ce personnage ?");
      if (!ok) return;

      msg.textContent = "Suppression en cours...";
      msg.className = "message";

      const r = await window.api.deleteCharacter(id_character, user.id_user);
      if (!r.ok) {
        msg.textContent = r.error || "Impossible de supprimer.";
        msg.classList.add("error");
        return;
      }

      msg.textContent = "Personnage supprimé.";
      msg.classList.add("success");
      setTimeout(() => (window.location.href = "dashboard.html"), 600);
    };
  } else {
    console.log("Hiding action buttons - isOwner:", isOwner);
    if (actionsContainer) {
      actionsContainer.style.display = "none";
    }
  }
}

/* ================== LOGIN ================== */
function setupLogin() {
  const form = document.getElementById("login-form");
  const msg = document.getElementById("message");
  const btnGoRegister = document.getElementById("btn-go-register");

  if (!form) return;

  if (btnGoRegister) {
    btnGoRegister.addEventListener("click", () => {
      window.location.href = "register.html";
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) {
      msg.textContent = "";
      msg.className = "message";
    }

    const login = document.getElementById("login")?.value.trim();
    const password = document.getElementById("password")?.value;

    if (!login || !password) {
      if (msg) {
        msg.textContent = "Login et mot de passe sont obligatoires.";
        msg.classList.add("error");
      }
      return;
    }

    if (!window.api || !window.api.login) {
      console.error("window.api.login est indisponible");
      if (msg) {
        msg.textContent =
          "Erreur interne : API de connexion indisponible (preload).";
        msg.classList.add("error");
      }
      return;
    }

    if (msg) {
      msg.textContent = "Connexion en cours...";
      msg.className = "message";
    }

    try {
      const res = await window.api.login(login, password);

      if (!res || !res.ok) {
        if (msg) {
          msg.textContent =
            (res && res.error) || "Impossible de se connecter (erreur inconnue).";
          msg.classList.add("error");
        }
        return;
      }

      if (msg) {
        msg.textContent = "Connexion réussie, redirection...";
        msg.classList.add("success");
      }

      localStorage.setItem("dndUser", JSON.stringify(res.user));
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    } catch (err) {
      console.error("Erreur JS pendant login:", err);
      if (msg) {
        msg.textContent =
          "Erreur inattendue pendant la connexion : " + err.message;
        msg.classList.add("error");
      }
    }
  });
}

/* ===== DISTRIBUTION DES POINTS DE CARACTÉRISTIQUES ===== */
function setupAbilityPoints() {
  const MIN_ABILITY = 8;
  const MAX_ABILITY = 15;
  const INITIAL_POINTS = 27;
  const abilities = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];
  
  // Fonction pour calculer le coût d'un point de caractéristique
  // 8-12 : coût 1, 13-15 : coût 2
  function getPointCost(value) {
    if (value <= 12) {
      return 1; // Points 8-12 coûtent 1
    } else {
      return 2; // Points 13-15 coûtent 2
    }
  }
  
  // Fonction pour calculer le coût total d'une caractéristique
  function calculateAbilityCost(value) {
    if (value <= MIN_ABILITY) return 0;
    let cost = 0;
    for (let v = MIN_ABILITY + 1; v <= value; v++) {
      cost += getPointCost(v);
    }
    return cost;
  }
  
  // Fonction pour calculer les points restants
  function calculateRemainingPoints() {
    let totalUsed = 0;
    abilities.forEach(ability => {
      const row = document.querySelector(`[data-ability="${ability}"]`);
      if (row) {
        const valueSpan = row.querySelector(".ability-value");
        if (valueSpan) {
          const value = parseInt(valueSpan.textContent, 10) || MIN_ABILITY;
          totalUsed += calculateAbilityCost(value);
        }
      }
    });
    return INITIAL_POINTS - totalUsed;
  }
  
  // Fonction pour mettre à jour l'affichage des points restants
  function updatePointsDisplay() {
    const pointsLeft = calculateRemainingPoints();
    const pointsEl = document.getElementById("points-left");
    if (pointsEl) {
      pointsEl.innerHTML = `Points restants : <strong>${pointsLeft}</strong>`;
      if (pointsLeft < 0) {
        pointsEl.style.color = "#ff6b6b";
      } else {
        pointsEl.style.color = "";
      }
    }
  }
  
  // Initialiser les boutons
  abilities.forEach(ability => {
    const row = document.querySelector(`[data-ability="${ability}"]`);
    if (!row) {
      console.warn(`Row not found for ability: ${ability}`);
      return;
    }
    
    const valueSpan = row.querySelector(".ability-value");
    const btnInc = row.querySelector(".btn-inc");
    const btnDec = row.querySelector(".btn-dec");
    
    if (!valueSpan || !btnInc || !btnDec) {
      console.warn(`Elements not found for ability: ${ability}`, { valueSpan, btnInc, btnDec });
      return;
    }
    
    // Retirer les anciens listeners en clonant les boutons
    const newBtnInc = btnInc.cloneNode(true);
    const newBtnDec = btnDec.cloneNode(true);
    btnInc.parentNode.replaceChild(newBtnInc, btnInc);
    btnDec.parentNode.replaceChild(newBtnDec, btnDec);
    
    // Bouton +
    newBtnInc.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentValue = parseInt(valueSpan.textContent, 10) || MIN_ABILITY;
      
      // Ne pas dépasser le maximum
      if (currentValue >= MAX_ABILITY) {
        console.log(`Cannot increase ${ability}: already at max (${MAX_ABILITY})`);
        return;
      }
      
      const newValue = currentValue + 1;
      const costToIncrease = getPointCost(newValue);
      const pointsLeft = calculateRemainingPoints();
      
      console.log(`Trying to increase ${ability} from ${currentValue} to ${newValue}, cost: ${costToIncrease}, points left: ${pointsLeft}`);
      
      // Vérifier qu'on a assez de points
      if (pointsLeft >= costToIncrease) {
        valueSpan.textContent = newValue;
        updatePointsDisplay();
        console.log(`Increased ${ability} to ${newValue}`);
      } else {
        console.log(`Cannot increase ${ability}: not enough points (need ${costToIncrease}, have ${pointsLeft})`);
      }
    });
    
    // Bouton -
    newBtnDec.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentValue = parseInt(valueSpan.textContent, 10) || MIN_ABILITY;
      
      // Ne pas descendre en dessous du minimum
      if (currentValue <= MIN_ABILITY) {
        console.log(`Cannot decrease ${ability}: already at min (${MIN_ABILITY})`);
        return;
      }
      
      valueSpan.textContent = currentValue - 1;
      updatePointsDisplay();
      console.log(`Decreased ${ability} to ${currentValue - 1}`);
    });
  });
  
  console.log("setupAbilityPoints initialized");
  
  // Mettre à jour l'affichage initial
  updatePointsDisplay();
}

/* ================== INIT ================== */
window.addEventListener("DOMContentLoaded", () => {
  // LOGIN
  if (document.getElementById("login-form")) {
    setupLogin();
  }

  // DASHBOARD
  if (document.getElementById("welcome-title")) {
    const user = requireLogin();
    if (!user) return;

    document.getElementById(
      "welcome-title"
    ).textContent = `Bienvenue, ${user.pseudo}`;

    loadTablesForCurrentUser();
    loadCharactersForDashboard();

    // ✅ bons noms de pages (tes fichiers)
    document
      .getElementById("btn-create-table")
      ?.addEventListener("click", () => {
        window.location.href = "create-table.html";
      });
    document.getElementById("btn-join-table")?.addEventListener("click", () => {
      window.location.href = "join-table.html";
    });
    document
      .getElementById("btn-create-character")
      ?.addEventListener("click", () => {
        window.location.href = "character.html";
      });

    document.getElementById("btn-logout")?.addEventListener("click", () => {
      localStorage.removeItem("dndUser");
      localStorage.removeItem("selectedTableId");
      localStorage.removeItem("selectedCharacterId");
      window.location.href = "login.html";
    });
  }

  // TABLE VIEW
  if (document.getElementById("table-view-root")) {
    requireLogin();
    loadTableView();

    document
      .getElementById("btn-back-dashboard")
      ?.addEventListener("click", () => {
        window.location.href = "dashboard.html";
      });
  }

  // CHARACTER VIEW
  if (document.getElementById("character-view-root")) {
    requireLogin();
    loadCharacterView();

    document
      .getElementById("btn-back-dashboard")
      ?.addEventListener("click", () => {
        window.location.href = "dashboard.html";
      });
  }

  // CREATE TABLE (form)
  if (document.getElementById("table-form")) {
    const user = requireLogin();
    if (!user) return;

    const form = document.getElementById("table-form");
    const msg = document.getElementById("table-message");

    document
      .getElementById("btn-back-dashboard")
      ?.addEventListener("click", () => {
        window.location.href = "dashboard.html";
      });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (msg) {
        msg.textContent = "";
        msg.className = "message";
      }

      const nom = document.getElementById("table-name")?.value.trim();
      const description = document.getElementById("table-desc")?.value.trim();
      const maxJoueurs = document.getElementById("table-max")?.value;
      const prochaineSession = document.getElementById("table-date")?.value;

      if (!nom) {
        if (msg) {
          msg.textContent = "Le nom de la table est obligatoire.";
          msg.classList.add("error");
        }
        return;
      }

      if (!window.api || !window.api.createTable) {
        console.error("window.api.createTable est indisponible");
        if (msg) {
          msg.textContent =
            "Erreur interne : API de création de table indisponible (preload).";
          msg.classList.add("error");
        }
        return;
      }

      if (msg) {
        msg.textContent = "Création de la table en cours...";
        msg.className = "message";
      }

      try {
        const res = await window.api.createTable({
          id_user: user.id_user,
          nom,
          description: description || null,
          max_joueurs: maxJoueurs ? parseInt(maxJoueurs, 10) : null,
          prochaine_session: prochaineSession || null,
        });

        if (!res || !res.ok) {
          if (msg) {
            msg.textContent =
              (res && res.error) ||
              "Impossible de créer la table (erreur inconnue).";
            msg.classList.add("error");
          }
          return;
        }

        if (msg) {
          msg.textContent = "Table créée avec succès, redirection...";
          msg.classList.add("success");
        }

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } catch (err) {
        console.error("Erreur JS pendant createTable:", err);
        if (msg) {
          msg.textContent =
            "Erreur inattendue pendant la création : " + err.message;
          msg.classList.add("error");
        }
      }
    });
  }

  // CREATE CHARACTER (form)
  if (document.getElementById("character-form") && !localStorage.getItem("editingCharacterId")) {
    requireLogin();
    document
      .getElementById("btn-back-dashboard")
      ?.addEventListener("click", () => {
        window.location.href = "dashboard.html";
      });
    
    // Initialiser la distribution des points pour la création
    setTimeout(() => setupAbilityPoints(), 100);
  }

  // EDIT CHARACTER (form)
  if (document.getElementById("character-form") && localStorage.getItem("editingCharacterId")) {
    const user = requireLogin();
    if (!user) return;

    const editingId = localStorage.getItem("editingCharacterId");
    const id_character = Number(editingId);
    
    if (!id_character) {
      window.location.href = "dashboard.html";
      return;
    }

    // Bouton retour vers la fiche
    document
      .getElementById("btn-back-character")
      ?.addEventListener("click", () => {
        localStorage.removeItem("editingCharacterId");
        window.location.href = "character-view.html";
      });

    // Charger les données du personnage
    (async () => {
      const res = await window.api.getCharacter(id_character);
      if (!res.ok || !res.character) {
        alert("Impossible de charger le personnage.");
        window.location.href = "dashboard.html";
        return;
      }

      const c = res.character;
      
      // Vérifier que l'utilisateur est le propriétaire
      if (Number(c.id_user) !== Number(user.id_user)) {
        alert("Vous n'êtes pas autorisé à modifier ce personnage.");
        localStorage.removeItem("editingCharacterId");
        window.location.href = "dashboard.html";
        return;
      }

      // Remplir les champs
      document.getElementById("char-name").value = c.nom || "";
      document.getElementById("char-race").value = c.race || "";
      document.getElementById("char-class").value = c.classe || "";
      document.getElementById("char-align").value = c.alignement || "";

      // Afficher l'avatar existant
      const avatarPreview = document.getElementById("avatar-preview");
      if (c.avatarData) {
        avatarPreview.innerHTML = `<img src="${c.avatarData}" alt="Avatar" style="max-width: 140px; max-height: 140px; border-radius: 10px;">`;
      }

      // Charger les caractéristiques
      const abilities = c.abilities || {};
      Object.keys(abilities).forEach(ability => {
        const row = document.querySelector(`[data-ability="${ability}"]`);
        if (row) {
          const valueSpan = row.querySelector(".ability-value");
          if (valueSpan) {
            valueSpan.textContent = abilities[ability];
          }
        }
      });
      
      // Initialiser la distribution des points pour l'édition
      setTimeout(() => setupAbilityPoints(), 100);

      // Gérer le formulaire
      const form = document.getElementById("character-form");
      const msg = document.getElementById("char-message");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Récupérer les valeurs du formulaire
        const nom = document.getElementById("char-name").value.trim();
        const race = document.getElementById("char-race").value.trim();
        const classe = document.getElementById("char-class").value.trim();
        const alignement = document.getElementById("char-align").value.trim();
        
        // Gérer l'avatar
        let avatarData = c.avatarData || null;
        const avatarInput = document.getElementById("char-avatar");
        if (avatarInput.files && avatarInput.files[0]) {
          const file = avatarInput.files[0];
          const reader = new FileReader();
          avatarData = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
        }

        // Récupérer les caractéristiques
        const abilitiesData = {};
        document.querySelectorAll("[data-ability]").forEach(row => {
          const ability = row.dataset.ability;
          const value = parseInt(row.querySelector(".ability-value").textContent, 10);
          abilitiesData[ability] = value;
        });

        if (msg) {
          msg.textContent = "Modification en cours...";
          msg.className = "message";
        }

        try {
          const res = await window.api.updateCharacter({
            id_character,
            id_user: user.id_user,
            nom,
            race,
            classe,
            alignement,
            abilities: abilitiesData,
            avatarData,
          });

          if (!res || !res.ok) {
            if (msg) {
              msg.textContent = (res && res.error) || "Impossible de modifier le personnage.";
              msg.classList.add("error");
            }
            return;
          }

          if (msg) {
            msg.textContent = "Personnage modifié avec succès !";
            msg.classList.add("success");
          }

          localStorage.removeItem("editingCharacterId");
          setTimeout(() => {
            window.location.href = "character-view.html";
          }, 500);
        } catch (err) {
          console.error("Erreur JS pendant updateCharacter:", err);
          if (msg) {
            msg.textContent = "Erreur inattendue : " + err.message;
            msg.classList.add("error");
          }
        }
      });
    })();
  }
});
