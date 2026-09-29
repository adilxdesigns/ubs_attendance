import { useApp } from "../context/AppContext";
import { TAB_ORDER } from "../data/constants";

const NAV_ITEMS = [
  { tab: "checkin",  label: "Check in / out", icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> },
  { tab: "calendar", label: "Calendar",       icon: <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg> },
  { tab: "history",  label: "History",        icon: <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg> },
  { tab: "leaves",   label: "Leaves",         icon: <svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg> },
  { tab: "insights", label: "Insights",       icon: <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg> },
  { tab: "profile",  label: "Profile",        icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg> },
  { tab: "admin",    label: "Admin",          icon: <svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>, adminOnly: true },
];

export default function Sidebar() {
  const { user, activeTab, setActiveTab, logout, pendingCount } = useApp();

  return (
    <aside id="sidebar" className="sidebar" aria-label="Main navigation">
      <div className="side-top">
        <div className="logo">
          <span className="logo-icon">📋</span>
          <span className="logo-text">AttendPro</span>
        </div>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map(({ tab, label, icon, adminOnly }) => {
          if (adminOnly && !user?.isAdmin) return null;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              className={`nav-item${isActive ? " active" : ""}`}
              data-tab={tab}
              title={`${label} (Alt+${TAB_ORDER.indexOf(tab)+1})`}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => setActiveTab(tab)}
            >
              {icon}
              <span className="nav-label">
                {label}
                {tab === "admin" && pendingCount > 0 && (
                  <span className="admin-badge">{pendingCount}</span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
      <button id="logoutBtn" className="nav-item" title="Sign out" type="button" onClick={logout}>
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        <span className="nav-label">Sign out</span>
      </button>
    </aside>
  );
}
