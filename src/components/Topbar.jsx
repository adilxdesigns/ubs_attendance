import { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { store, getNotifs } from "../data/store";

export default function Topbar({ title }) {
  const { user, theme, toggleTheme, toggleSidebar, sidebarCollapsed, bellOpen, setBellOpen, notifCount, refreshNotifCount } = useApp();
  const isMobile = useRef(window.matchMedia("(max-width: 900px)"));

  function handleMenu() {
    toggleSidebar(isMobile.current.matches);
  }

  function handleBell() {
    setBellOpen(o => !o);
    if (!bellOpen) {
      // mark as read
      const a = getNotifs();
      a.forEach(x => (x.read = true));
      store.set("ubs_notifs", JSON.stringify(a));
      refreshNotifCount();
    }
  }

  // close bell on outside click
  useEffect(() => {
    function handler(e) {
      if (bellOpen && !e.target.closest(".bell-wrap")) setBellOpen(false);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [bellOpen, setBellOpen]);

  const notifs = getNotifs();

  return (
    <header className="topbar">
      <div className="top-left">
        <button
          id="menuBtn" className="icon-btn" type="button"
          aria-label="Open or close menu"
          aria-expanded={isMobile.current.matches ? String(!sidebarCollapsed) : "true"}
          onClick={handleMenu}
        >
          <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <h2 id="sectionTitle">{title}</h2>
      </div>
      <div className="user-area">
        {/* Bell */}
        <div className="bell-wrap">
          <button id="bellBtn" className="icon-btn" type="button" aria-label="Notifications" onClick={handleBell}>
            <svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0"/></svg>
            {notifCount > 0 && <span className="bell-count">{notifCount}</span>}
          </button>
          {bellOpen && (
            <div id="bellPanel" className="bell-panel" role="region" aria-label="Notifications">
              <h3>Notifications</h3>
              <ul id="bellList">
                {notifs.length === 0
                  ? <li className="muted">You are all caught up. New updates will appear here.</li>
                  : notifs.map((n, i) => (
                    <li key={i} className={n.read ? "" : "unread"}>
                      <span>{n.text}</span>
                      <small>{new Date(n.t).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small>
                    </li>
                  ))
                }
              </ul>
            </div>
          )}
        </div>

        {/* Theme */}
        <button id="themeBtn" className="icon-btn" type="button" onClick={toggleTheme} aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        {/* User info */}
        {user && (
          <>
            <div className="user-text">
              <strong id="userName">{user.name}</strong>
              <span id="userEmail" className="muted">{user.email}</span>
            </div>
            <div className="avatar" id="avatar" aria-hidden="true">{user.initials}</div>
          </>
        )}
      </div>
    </header>
  );
}
