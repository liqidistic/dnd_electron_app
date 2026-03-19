const { contextBridge, ipcRenderer, clipboard } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // ===== AUTH =====
  login: (login, password) =>
    ipcRenderer.invoke("auth:login", { login, password }),
  register: (payload) => ipcRenderer.invoke("auth:register", payload),

  // ===== TABLES =====
  listTablesForUser: (id_user) =>
    ipcRenderer.invoke("tables:listForUser", { id_user }),
  createTable: (payload) => ipcRenderer.invoke("tables:create", payload),
  getTable: (id_table) => ipcRenderer.invoke("tables:getOne", { id_table }),
  joinTable: (payload) => ipcRenderer.invoke("tables:join", payload),
  leaveTable: (payload) => ipcRenderer.invoke("tables:leave", payload),
  deleteTable: (payload) => ipcRenderer.invoke("tables:delete", payload),
  kickPlayer: (payload) => ipcRenderer.invoke("tables:kickPlayer", payload),

  // ===== AGENDA =====
  createAgendaEvent: (payload) => ipcRenderer.invoke("agenda:create", payload),

  // Copier dans le presse-papiers
  copyToClipboard: (text) => {
    try {
      clipboard.writeText(text || "");
      return true;
    } catch (e) {
      console.error("Erreur copyToClipboard:", e);
      return false;
    }
  },

  // ===== PERSONNAGES =====
  createCharacter: (payload) =>
    ipcRenderer.invoke("characters:create", payload),
  updateCharacter: (payload) =>
    ipcRenderer.invoke("characters:update", payload),
  listCharactersForUser: (id_user) =>
    ipcRenderer.invoke("characters:listForUser", { id_user }),
  getCharacter: (id_character) =>
    ipcRenderer.invoke("characters:getOne", { id_character }),
  deleteCharacter: (id_character, id_user) =>
    ipcRenderer.invoke("characters:delete", { id_character, id_user }),
  assignCharacterToTable: (payload) =>
    ipcRenderer.invoke("characters:assignToTable", payload),
});
