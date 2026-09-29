// ============================================================
//  Shared utility / helper functions
// ============================================================

import { LATE_AFTER, RING_CIRCUMFERENCE, LEAVE_TYPES, DEPTS, BASE_STAFF, BPO_CLIENTS } from "./constants";
import { getHolidays, getEdits, teamLeaves, loadAll, getLeaves, store, saveAll } from "./store";

export const pad        = (n) => String(n).padStart(2, "0");
export const dayKey     = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const fmtTime    = (d) => d ? d.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" }) : "--:--";
export const fmtHours   = (ms) => { const m = Math.max(0, Math.floor(ms/60000)); return `${Math.floor(m/60)}h ${pad(m%60)}m`; };
export const fmtMin     = (m) => fmtTime(new Date(2000, 0, 1, Math.floor(m/60), m%60));
export const isWeekend  = (d) => d.getDay()===0 || d.getDay()===6;
export const parseDay   = (s) => new Date(s+"T00:00:00");
export const minsOf     = (iso) => { const d=new Date(iso); return d.getHours()*60+d.getMinutes(); };
export const shortDate  = (s) => parseDay(s).toLocaleDateString([], { day:"numeric", month:"short" });
export const initials   = (n) => n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
export const typeCls    = (t) => "lt-"+t.split(" ")[0].toLowerCase();
export const isActiveLeave = (l) => l.status!=="Cancelled" && l.status!=="Rejected";
export const rnd = (n) => { const x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); };
export { RING_CIRCUMFERENCE };

export function countDays(from, to) {
  let n=0; const d=parseDay(from), end=parseDay(to);
  for (; d<=end; d.setDate(d.getDate()+1)) if (!isWeekend(d)) n++;
  return n;
}

export const usedDays = (list, type) =>
  list.filter(l => l.type===type && isActiveLeave(l)).reduce((s,l) => s+l.days, 0);

export function dayInfo(key, d) {
  const hol = getHolidays().find(x => x.date===key);
  if (hol) return { st:"holiday", name:hol.name, tip:"Holiday: "+hol.name };
  if (isWeekend(d) && !loadAll()[key]) return { st:"off", tip:"Weekend" };
  const lv = getLeaves().find(l => isActiveLeave(l) && key>=l.from && key<=l.to);
  if (lv) return { st:"leave", lv, tip:`${lv.type} (${lv.status.toLowerCase()})` };
  const r = loadAll()[key];
  if (r) {
    const st = minsOf(r.checkIn) > LATE_AFTER ? "late" : "present";
    const out = r.checkOut ? fmtTime(new Date(r.checkOut)) : "still working";
    return { st, tip:`${st==="late"?"Late":"Present"}: ${fmtTime(new Date(r.checkIn))} to ${out}` };
  }
  return key < dayKey() ? { st:"absent", tip:"No attendance recorded" } : { st:"none", tip:"" };
}

/* ---- Staff ---- */
export const jget = (k, d) => { try { return JSON.parse(store.get(k)||d); } catch { return JSON.parse(d); } };

export function loadStaff() {
  const off   = jget("ubs_inactive", "[]");
  const extra = jget("ubs_new_staff", "[]");
  return [...BASE_STAFF, ...extra].map(e => ({
    ...e,
    dept:   DEPTS.includes(e.dept) ? e.dept : DEPTS[0],
    active: !off.includes(e.id),
  }));
}

/* ---- Staff day simulation ---- */
export function staffDay(e, key) {
  if (!e.active) return { st:"inactive" };
  if (e.joined && key < e.joined) return { st:"none" };
  const h = getHolidays().find(x => x.date===key);
  if (h && !isWeekend(parseDay(key))) return { st:"holiday", name:h.name };
  const r = baseDay(e, key);
  const ed = getEdits()[e.id+"|"+key];
  return ed && key<=dayKey() ? { ...r, ...ed, edited:true } : r;
}

function baseDay(e, key) {
  const d=parseDay(key), today=dayKey();
  if (isWeekend(d)) return { st:"off" };
  if (key > today) return { st:"none" };
  const lv = teamLeaves().find(l => l.emp===e.id && l.status==="Approved" && key>=l.from && key<=l.to);
  if (lv) return { st:"leave", type:lv.type };
  const seed = e.id*7919 + parseInt(key.replace(/-/g,""),10), r=rnd(seed);
  const now=new Date(), nowM=now.getHours()*60+now.getMinutes();
  if (r < 0.08) return { st: key===today&&nowM<11*60 ? "none" : "absent" };
  if (r < 0.14) return { st:"leave", type:Object.keys(LEAVE_TYPES)[Math.floor(rnd(seed+3)*3)] };
  const inM  = 9*60+20 + Math.floor(Math.pow(rnd(seed+1),2.2)*50);
  const outM = 18*60+30 + Math.floor(rnd(seed+2)*60);
  const st   = inM > LATE_AFTER ? "late" : "present";
  if (key===today) return inM>nowM ? { st:"none" } : { st, inM, outM: outM>nowM?null:outM };
  return { st, inM, outM };
}

/* ---- Seed ---- */
export function seedTeam() {
  if (store.get("ubs_team_leaves")) return;
  const wd = n => { const d=new Date(); d.setDate(d.getDate()+n); while(isWeekend(d)) d.setDate(d.getDate()+(n<0?-1:1)); return dayKey(d); };
  const mk = (id,emp,type,a,b,reason,status) => ({ id, emp, type, from:wd(a), to:wd(b), days:countDays(wd(a),wd(b)), reason, status });
  store.set("ubs_team_leaves", JSON.stringify([
    mk(101, 2, "Casual Leave", 3, 4, "Personal work", "Pending"),
    mk(102, 8, "Sick Leave",   1, 1, "Doctor appointment", "Pending"),
    mk(103, 5, "Earned Leave", 7,11, "Family trip", "Pending"),
    mk(104,12, "Casual Leave",-6,-6, "Festival", "Approved"),
    mk(105, 3, "Sick Leave",  -3,-3, "Not feeling well", "Rejected"),
  ]));
}
