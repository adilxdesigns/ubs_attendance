// ============================================================
//  Unique Business Solutions — Attendance App
//  Central data: departments, clients, roles, seed staff
// ============================================================

export const COMPANY = "Unique Business Solutions";
export const WORK_HOURS = 9;
export const LATE_AFTER = 9 * 60 + 30; // 9:30 AM
export const SHIFT = "9:30 AM to 6:30 PM";
export const LOCATION = "Chennai Office";
export const ADMIN_EMAIL_PREFIX = "admin";
export const RING_CIRCUMFERENCE = 2 * Math.PI * 88;

export const DEPTS = ["BPO", "HR", "Back Office"];

export const BPO_CLIENTS = ["Fibe", "PayServe", "ICICI", "HDFC First"];

export const ROLES_BY_DEPT = {
  BPO: ["Tele Caller", "Senior Tele Caller", "Team Leader", "Quality Analyst"],
  HR: ["HR Executive", "HR Manager"],
  "Back Office": ["Back Office Executive", "Back Office Manager"],
};

export const LEAVE_TYPES = {
  "Casual Leave": 12,
  "Sick Leave": 8,
  "Earned Leave": 15,
};

// Seed staff — 15 employees, all BPO employees assigned to real clients
export const BASE_STAFF = [
  { id: 1,  name: "Aarav Mehta",      dept: "BPO",         client: "Fibe",      role: "Tele Caller",           email: "aarav.mehta@ubs.com" },
  { id: 2,  name: "Divya Krishnan",   dept: "BPO",         client: "Fibe",      role: "Tele Caller",           email: "divya.krishnan@ubs.com" },
  { id: 3,  name: "Karthik Raman",    dept: "BPO",         client: "Fibe",      role: "Senior Tele Caller",    email: "karthik.raman@ubs.com" },
  { id: 4,  name: "Meera Nair",       dept: "BPO",         client: "PayServe",  role: "Tele Caller",           email: "meera.nair@ubs.com" },
  { id: 5,  name: "Rohan Iyer",       dept: "BPO",         client: "PayServe",  role: "Senior Tele Caller",    email: "rohan.iyer@ubs.com" },
  { id: 6,  name: "Nisha Patel",      dept: "BPO",         client: "PayServe",  role: "Tele Caller",           email: "nisha.patel@ubs.com" },
  { id: 7,  name: "Harish Babu",      dept: "BPO",         client: "ICICI",     role: "Tele Caller",           email: "harish.babu@ubs.com" },
  { id: 8,  name: "Lakshmi Devi",     dept: "BPO",         client: "ICICI",     role: "Tele Caller",           email: "lakshmi.devi@ubs.com" },
  { id: 9,  name: "Arjun Menon",      dept: "BPO",         client: "ICICI",     role: "Quality Analyst",       email: "arjun.menon@ubs.com" },
  { id: 10, name: "Ananya Rao",       dept: "BPO",         client: "HDFC First",role: "Tele Caller",           email: "ananya.rao@ubs.com" },
  { id: 11, name: "Suresh Pillai",    dept: "BPO",         client: "HDFC First",role: "Senior Tele Caller",    email: "suresh.pillai@ubs.com" },
  { id: 12, name: "Priya Sharma",     dept: "HR",          client: null,        role: "HR Executive",          email: "priya.sharma@ubs.com" },
  { id: 13, name: "Sanjay Kumar",     dept: "HR",          client: null,        role: "HR Manager",            email: "sanjay.kumar@ubs.com" },
  { id: 14, name: "Fatima Khan",      dept: "Back Office", client: null,        role: "Back Office Executive", email: "fatima.khan@ubs.com" },
  { id: 15, name: "Vikram Singh",     dept: "Back Office", client: null,        role: "Back Office Manager",   email: "vikram.singh@ubs.com" },
];

export const TITLES = {
  checkin:  "Check in / out",
  calendar: "Calendar",
  history:  "History",
  leaves:   "Leaves",
  insights: "Insights",
  profile:  "Profile",
  admin:    "Admin",
};

export const TAB_ORDER = ["checkin", "calendar", "history", "leaves", "insights", "profile", "admin"];

export const STATUS_LABEL = {
  present:  "Present",
  late:     "Late",
  absent:   "Absent",
  leave:    "On leave",
  off:      "Weekend",
  holiday:  "Holiday",
  inactive: "Inactive",
  none:     "Not in yet",
};

export const STATUS_CLS = {
  present:  "ok",
  late:     "wait",
  absent:   "bad",
  leave:    "lv",
  off:      "off",
  holiday:  "hd",
  inactive: "off",
  none:     "off",
};
