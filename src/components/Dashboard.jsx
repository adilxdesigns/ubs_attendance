import { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { TAB_ORDER, TITLES } from "../data/constants";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CheckinView from "./views/CheckinView";
import CalendarView from "./views/CalendarView";
import HistoryView from "./views/HistoryView";
import LeavesView from "./views/LeavesView";
import InsightsView from "./views/InsightsView";
import ProfileView from "./views/ProfileView";
import AdminView from "./views/AdminView";
import Toast from "./ui/Toast";
import Modal from "./ui/Modal";

const VIEWS = {
  checkin:  CheckinView,
  calendar: CalendarView,
  history:  HistoryView,
  leaves:   LeavesView,
  insights: InsightsView,
  profile:  ProfileView,
  admin:    AdminView,
};

export default function Dashboard() {
  const { user, activeTab, setActiveTab, sidebarOpen, sidebarCollapsed, closeSidebar, toast, modal } = useApp();
  const isMobileRef = useRef(window.matchMedia("(max-width: 900px)"));

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e) {
      if (e.altKey && /^[1-7]$/.test(e.key) && !modal) {
        e.preventDefault();
        const tab = TAB_ORDER[+e.key - 1];
        if (tab === "admin" && !user?.isAdmin) return;
        setActiveTab(tab);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [user, modal, setActiveTab]);

  // Close sidebar on resize
  useEffect(() => {
    const mq = isMobileRef.current;
    const handler = () => closeSidebar();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [closeSidebar]);

  const shellClass = [
    "shell",
    sidebarOpen ? "nav-open" : "",
    sidebarCollapsed ? "collapsed" : "",
  ].filter(Boolean).join(" ");

  const ActiveView = VIEWS[activeTab] || CheckinView;

  return (
    <div id="dashView" className={shellClass}>
      <div className="scrim" onClick={closeSidebar} />
      <Sidebar />
      <div className="main-area">
        <Topbar title={TITLES[activeTab]} />
        <main className="content">
          <ActiveView />
        </main>
        <footer className="kbd-hint muted small">
          Shortcuts: <kbd>Alt</kbd> + <kbd>1</kbd> to <kbd>7</kbd> switch pages, <kbd>Esc</kbd> closes popups.
        </footer>
      </div>
      {toast && <Toast msg={toast.msg} isError={toast.isError} />}
      {modal && <Modal />}
    </div>
  );
}
