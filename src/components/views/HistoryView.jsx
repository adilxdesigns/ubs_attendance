import { useState, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { dayKey, dayInfo, isWeekend, parseDay, fmtTime, fmtHours, countDays } from "../../data/utils";
import { loadAll, getRegs, store } from "../../data/store";
import { WORK_HOURS, LATE_AFTER } from "../../data/constants";

const HS_LABEL = { present:"Present", late:"Late", absent:"Absent", leave:"On leave", holiday:"Holiday" };
const HS_CLS   = { present:"ok", late:"wait", absent:"bad", leave:"lv", holiday:"hd" };

function hoursHtml(ms) {
  const h = ms/3600000;
  return <span className={h < WORK_HOURS ? "hrs-low" : "hrs-ok"}>{fmtHours(ms)}</span>;
}

function myRows(ym, filter) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return [];
  const y = +ym.slice(0,4), m = +ym.slice(5), last = new Date(y,m,0).getDate(), out = [];
  for (let n = 1; n <= last; n++) {
    const d = new Date(y, m-1, n), key = dayKey(d), info = dayInfo(key, d);
    if (key > dayKey() || info.st === "off" || info.st === "none") continue;
    if (filter === "all" || filter === info.st) out.push({ key, info, rec: loadAll()[key] });
  }
  return out.reverse();
}

export default function HistoryView() {
  const { showToast, setModal } = useApp();
  const [month, setMonth] = useState(dayKey().slice(0,7));
  const [status, setStatus] = useState("all");

  const rows = myRows(month, status);

  function downloadCSV() {
    if (!rows.length) { showToast("No data to download.", true); return; }
    const cell = v => { let s = String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'"+s; return '"'+s.replace(/"/g,'""')+'"'; };
    const data = [["Date","Status","Check in","Check out","Hours"]].concat(
      rows.map(({ key, info, rec }) => [
        key, HS_LABEL[info.st],
        rec ? fmtTime(new Date(rec.checkIn)) : "",
        rec?.checkOut ? fmtTime(new Date(rec.checkOut)) : "",
        rec?.checkOut ? ((new Date(rec.checkOut)-new Date(rec.checkIn))/3600000).toFixed(1) : "",
      ])
    );
    const blob = new Blob(["\uFEFF"+data.map(r => r.map(cell).join(",")).join("\r\n")], { type:"text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `my-attendance-${month}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast("CSV downloaded.");
  }

  function requestCorrection() {
    let rgDate = "", rgField = "out", rgTime = "", rgReason = "";
    setModal({
      title: "Request a correction",
      saveLabel: "Send request",
      body: (
        <div>
          <label htmlFor="rgDate">Date</label>
          <input id="rgDate" type="date" max={dayKey()} onChange={e => rgDate = e.target.value} />
          <label htmlFor="rgField">What to correct</label>
          <select id="rgField" onChange={e => rgField = e.target.value}>
            <option value="out">Check-out time (forgot to check out)</option>
            <option value="in">Check-in time</option>
          </select>
          <label htmlFor="rgTime">Correct time</label>
          <input id="rgTime" type="time" onChange={e => rgTime = e.target.value} />
          <label htmlFor="rgReason">Reason <span className="muted">(required)</span></label>
          <textarea id="rgReason" maxLength={200} placeholder="Why is this change needed?" onChange={e => rgReason = e.target.value} />
        </div>
      ),
      onSave: () => {
        const d = document.getElementById("rgDate")?.value;
        const fi = document.getElementById("rgField")?.value;
        const tm = document.getElementById("rgTime")?.value;
        const re = document.getElementById("rgReason")?.value?.trim();
        if (!d) return "Choose the date to correct.";
        if (d > dayKey()) return "The date can't be in the future.";
        if (!tm) return "Enter the correct time.";
        if (!re) return "Enter a reason.";
        const min = +tm.slice(0,2)*60 + +tm.slice(3);
        const regs = getRegs();
        if (regs.some(g => g.date===d && g.field===fi && g.status==="Pending")) return "You already have a pending request for that.";
        regs.push({ id: Date.now(), date: d, field: fi, min, reason: re, status: "Pending" });
        store.set("ubs_regs", JSON.stringify(regs));
        showToast("Correction request sent to your admin.");
      },
    });
  }

  return (
    <section id="view-history" className="view">
      <div className="page-head">
        <h1>History</h1>
        <p className="muted">Every working day of a month, with filters and download.</p>
      </div>
      <div className="toolbar">
        <input id="hsMonth" type="month" aria-label="Month" value={month} onChange={e => setMonth(e.target.value)} />
        <select id="hsStatus" aria-label="Status filter" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="leave">On leave</option>
          <option value="holiday">Holiday</option>
        </select>
        <button id="hsCsv" className="btn btn-ghost" type="button" disabled={!rows.length} onClick={downloadCSV}>Download CSV</button>
        <button id="hsReg" className="btn btn-primary btn-sm" type="button" onClick={requestCorrection}>Request correction</button>
      </div>
      <section className="card history">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Status</th><th>Check in</th><th>Check out</th><th>Hours</th></tr></thead>
            <tbody id="hsBody">
              {rows.length === 0
                ? <tr><td colSpan={5}><p id="hsEmpty" className="empty">No days match this month and filter. Try another month or choose All statuses.</p></td></tr>
                : rows.map(({ key, info, rec }) => {
                    const ci = rec ? new Date(rec.checkIn) : null;
                    const co = rec?.checkOut ? new Date(rec.checkOut) : null;
                    return (
                      <tr key={key} className={info.st==="absent"?"row-absent":""}>
                        <td>{parseDay(key).toLocaleDateString([], { weekday:"short", day:"numeric", month:"short" })}</td>
                        <td><span className={`pill ${HS_CLS[info.st]}`}>{HS_LABEL[info.st]}</span></td>
                        <td>{ci ? <span className={info.st==="late"?"t-late":"t-ok"}>{fmtTime(ci)}</span> : <span className="dash">--</span>}</td>
                        <td>{co ? <span className="t-out">{fmtTime(co)}</span> : ci ? <span className="dash">Working</span> : <span className="dash">--</span>}</td>
                        <td>{co ? hoursHtml(co-ci) : <span className="dash">--</span>}</td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
