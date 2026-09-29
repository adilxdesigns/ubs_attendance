import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { store, loadAll, saveAll, getLeaves, saveLeaves, getNotifs, addNotif as storeAddNotif, logAudit, resetAllData, getHolidays, getEdits, teamLeaves, saveTeamLeaves, getRegs } from "../data/store";
import { dayKey, isWeekend, minsOf, countDays, loadStaff, seedTeam, jget, initials, fmtHours, fmtTime, staffDay, shortDate } from "../data/utils";
import { LATE_AFTER, LEAVE_TYPES, DEPTS, WORK_HOURS, ADMIN_EMAIL_PREFIX } from "../data/constants";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [theme, setTheme]         = useState(() => store.get("ubs_theme") === "light" ? "light" : "dark");
  const [activeTab, setActiveTab] = useState("checkin");
  const [adminSub, setAdminSub]   = useState("overview");
  const [toast, setToast]         = useState(null);
  const [modal, setModal]         = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => store.get("ubs_collapsed") === "1");
  const [bellOpen, setBellOpen]   = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Attendance state
  const [todayRec, setTodayRec]   = useState(null);
  const [history, setHistory]     = useState([]);
  const [staff, setStaff]         = useState([]);
  const [busy, setBusy]           = useState(false);
  const [clock, setClock]         = useState(new Date());

  const toastTimerRef = useRef(null);

  // Theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    store.set("ubs_theme", next);
    setTheme(next);
  }, [theme]);

  // Clock ticker
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Toast helper
  const showToast = useCallback((msg, isError = false) => {
    clearTimeout(toastTimerRef.current);
    setToast({ msg, isError });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Notifications
  const refreshNotifCount = useCallback(() => {
    setNotifCount(getNotifs().filter(x => !x.read).length);
  }, []);

  const addNotif = useCallback((text) => {
    storeAddNotif(text);
    refreshNotifCount();
  }, [refreshNotifCount]);

  // Pending count
  const refreshPendingCount = useCallback(() => {
    const allLeaves = [...getLeaves(), ...teamLeaves(), ...getRegs()];
    setPendingCount(allLeaves.filter(r => r.status === "Pending").length);
  }, []);

  // Load data
  const loadData = useCallback(() => {
    const all = loadAll();
    const conv = r => ({ date: r.date, checkIn: new Date(r.checkIn), checkOut: r.checkOut ? new Date(r.checkOut) : null });
    const todayKey = dayKey();
    setTodayRec(all[todayKey] ? conv(all[todayKey]) : null);
    const hist = Object.values(all).map(conv).sort((a,b) => b.date.localeCompare(a.date)).slice(0,7);
    setHistory(hist);
    refreshNotifCount();
    refreshPendingCount();
  }, [refreshNotifCount, refreshPendingCount]);

  const reloadStaff = useCallback(() => {
    setStaff(loadStaff());
  }, []);

  // Seed data on first login
  const seedIfEmpty = useCallback(() => {
    const shift = n => { const d = new Date(); d.setDate(d.getDate()+n); while(isWeekend(d)) d.setDate(d.getDate()+1); return d; };
    if (!store.get("ubs_leaves")) {
      const a = shift(-9), b = new Date(a); b.setDate(b.getDate()+1);
      const c = shift(10);
      saveLeaves([
        { id: 1, type: "Sick Leave", from: dayKey(a), to: dayKey(b), days: countDays(dayKey(a), dayKey(b)), reason: "Fever", status: "Approved" },
        { id: 2, type: "Casual Leave", from: dayKey(c), to: dayKey(c), days: 1, reason: "Family function", status: "Pending" },
      ]);
    }
    if (store.get("ubs_seed2")) return;
    const all = loadAll(), lv = getLeaves();
    let n = 0;
    for (let i = 1; i <= 45; i++) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const k = dayKey(d);
      if (isWeekend(d) || all[k] || lv.some(l => k >= l.from && k <= l.to)) continue;
      n++;
      const inM = 9*60 + 20 + ((n*7)%35) + (n%6===0 ? 45 : 0);
      const outM = 18*60 + 30 + ((n*11)%50);
      const a = new Date(d); a.setHours(0, inM, 0, 0);
      const b2 = new Date(d); b2.setHours(0, outM, 0, 0);
      all[k] = { date: k, checkIn: a.toISOString(), checkOut: b2.toISOString() };
    }
    saveAll(all);
    store.set("ubs_seed2", "1");
  }, []);

  // Login
  const login = useCallback((email) => {
    const name = email.split("@")[0].replace(/[._-]+/g," ").replace(/\b\w/g, c => c.toUpperCase());
    const isAdmin = new RegExp(`^${ADMIN_EMAIL_PREFIX}`, "i").test(email);
    const u = { email, name, isAdmin, initials: initials(name) };
    store.set("ubs_user", JSON.stringify({ email }));
    setUser(u);
    setActiveTab("checkin");
    setAdminSub("overview");
    seedIfEmpty();
    if (isAdmin) {
      seedTeam();
      reloadStaff();
    }
    loadData();
  }, [seedIfEmpty, loadData, reloadStaff]);

  const logout = useCallback(() => {
    store.remove("ubs_user");
    setUser(null);
    setActiveTab("checkin");
    setTodayRec(null);
    setHistory([]);
    setBellOpen(false);
  }, []);

  // Punch in/out
  const punch = useCallback(() => {
    if (busy) return;
    const checkingOut = !!todayRec && !todayRec.checkOut;
    if (checkingOut) {
      // confirm via modal
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const all = loadAll(), k = dayKey();
      all[k] = { date: k, checkIn: new Date().toISOString(), checkOut: null };
      saveAll(all);
      setBusy(false);
      loadData();
      addNotif(minsOf(all[k].checkIn) > LATE_AFTER ? "You checked in late" : "You checked in on time");
      showToast("Checked in. Have a good day!");
    }, 500);
  }, [busy, todayRec, loadData, addNotif, showToast]);

  const confirmCheckout = useCallback(() => {
    setBusy(true);
    setTimeout(() => {
      const all = loadAll(), k = dayKey();
      if (all[k]) all[k].checkOut = new Date().toISOString();
      saveAll(all);
      setBusy(false);
      loadData();
      showToast("Checked out. Have a good evening!");
    }, 500);
  }, [loadData, showToast]);

  // Sidebar
  const toggleSidebar = useCallback((isMobile) => {
    if (isMobile) {
      setSidebarOpen(o => !o);
    } else {
      setSidebarCollapsed(c => {
        const next = !c;
        store.set("ubs_collapsed", next ? "1" : "0");
        return next;
      });
    }
  }, []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Reset
  const resetDemo = useCallback(() => {
    resetAllData(true);
    location.reload();
  }, []);

  // Auto-login on refresh
  useEffect(() => {
    const saved = store.get("ubs_user");
    if (saved) {
      try { login(JSON.parse(saved).email); } catch {}
    }
  // eslint-disable-next-line
  }, []);

  const value = {
    user, theme, toggleTheme,
    activeTab, setActiveTab,
    adminSub, setAdminSub,
    toast, showToast,
    modal, setModal,
    sidebarOpen, sidebarCollapsed,
    toggleSidebar, closeSidebar,
    bellOpen, setBellOpen,
    notifCount, addNotif, refreshNotifCount,
    pendingCount, refreshPendingCount,
    todayRec, history, loadData,
    staff, reloadStaff,
    busy, punch, confirmCheckout,
    clock,
    login, logout,
    resetDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
