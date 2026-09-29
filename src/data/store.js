// ============================================================
//  Storage helpers — localStorage with memory fallback
// ============================================================

const memory = {};

export const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return memory[key] ?? null; } },
  set(key, val) { try { localStorage.setItem(key, val); } catch { memory[key] = val; } },
  remove(key) { try { localStorage.removeItem(key); } catch { delete memory[key]; } },
};

export const loadAll   = () => JSON.parse(store.get("ubs_att")  || "{}");
export const saveAll   = (o) => store.set("ubs_att", JSON.stringify(o));
export const getLeaves = () => JSON.parse(store.get("ubs_leaves") || "[]");
export const saveLeaves = (a) => store.set("ubs_leaves", JSON.stringify(a));
export const teamLeaves = () => JSON.parse(store.get("ubs_team_leaves") || "[]");
export const saveTeamLeaves = (a) => store.set("ubs_team_leaves", JSON.stringify(a));
export const getNotifs = () => { try { return JSON.parse(store.get("ubs_notifs") || "[]"); } catch { return []; } };
export const getRegs   = () => { try { return JSON.parse(store.get("ubs_regs")   || "[]"); } catch { return []; } };
export const getEdits  = () => { try { return JSON.parse(store.get("ubs_edits")  || "{}"); } catch { return {}; } };
export const getAudit  = () => { try { return JSON.parse(store.get("ubs_audit")  || "[]"); } catch { return []; } };
export const getHolidays = () => { try { return JSON.parse(store.get("ubs_holidays") || "[]"); } catch { return []; } };

export function logAudit(who, what, reason = "") {
  const a = getAudit();
  a.unshift({ t: new Date().toISOString(), who, what, reason });
  store.set("ubs_audit", JSON.stringify(a.slice(0, 500)));
}

export function addNotif(text) {
  const a = getNotifs();
  a.unshift({ t: new Date().toISOString(), text, read: false });
  store.set("ubs_notifs", JSON.stringify(a.slice(0, 30)));
}

export function resetAllData(preserveTheme) {
  const th = store.get("ubs_theme");
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("ubs_"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
  Object.keys(memory).forEach((k) => delete memory[k]);
  if (preserveTheme && th) store.set("ubs_theme", th);
}
