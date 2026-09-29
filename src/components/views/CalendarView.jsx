import { useState } from "react";
import { dayKey, dayInfo, isWeekend, parseDay, fmtTime, typeCls } from "../../data/utils";
import { loadAll, getLeaves, getHolidays } from "../../data/store";
import { WORK_HOURS } from "../../data/constants";

const STATUS_LABEL = { present:"Present", late:"Late", absent:"Absent", leave:"On leave", off:"Weekend", holiday:"Holiday", none:"No record" };
const STATUS_CLS   = { present:"ok", late:"wait", absent:"bad", leave:"lv", off:"off", holiday:"hd", none:"off" };

function hoursHtml(ms) {
  const h = ms/3600000;
  return <span className={h < WORK_HOURS ? "hrs-low" : "hrs-ok"}>{Math.floor(h)}h {String(Math.floor((ms%3600000)/60000)).padStart(2,"0")}m</span>;
}

export default function CalendarView() {
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState(dayKey());

  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const monthLabel = calMonth.toLocaleDateString([], { month:"long", year:"numeric" });
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m+1, 0).getDate();
  const todayKey = dayKey();

  function prevMonth() { setCalMonth(d => { const n = new Date(d); n.setMonth(n.getMonth()-1); return n; }); }
  function nextMonth() { setCalMonth(d => { const n = new Date(d); n.setMonth(n.getMonth()+1); return n; }); }

  // Day panel
  const selD = parseDay(selectedDay), selInfo = dayInfo(selectedDay, selD), selRec = loadAll()[selectedDay];
  const isToday = selectedDay === todayKey;
  const noteMap = {
    absent:  "No check in was recorded for this day.",
    off:     "Weekend. No work scheduled.",
    holiday: null,
    leave:   null,
  };

  return (
    <section id="view-calendar" className="view">
      <div className="page-head">
        <h1>Calendar</h1>
        <p className="muted">Your attendance and leave, day by day.</p>
      </div>
      <div className="cal-layout">
        <section className="card cal">
          <div className="cal-head">
            <button id="calPrev" className="icon-btn" type="button" aria-label="Previous month" onClick={prevMonth}>‹</button>
            <h2 id="calTitle">{monthLabel}</h2>
            <button id="calNext" className="icon-btn" type="button" aria-label="Next month" onClick={nextMonth}>›</button>
          </div>
          <div className="cal-grid cal-dow">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d}>{d}</div>)}
          </div>
          <div id="calGrid" className="cal-grid">
            {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} className="cal-day blank"/>)}
            {Array.from({ length: days }, (_, i) => {
              const n = i+1;
              const d = new Date(y, m, n), key = dayKey(d), info = dayInfo(key, d);
              const cls = ["cal-day", info.st, key===todayKey?"today":"", key===selectedDay?"selected":""].filter(Boolean).join(" ");
              return (
                <button
                  key={key} type="button" className={cls}
                  data-key={key} title={info.tip}
                  aria-label={`${n}: ${info.tip || "no record"}`}
                  onClick={() => setSelectedDay(key)}
                >
                  {n}
                  {info.st === "holiday" && <span className="hn">{info.name}</span>}
                </button>
              );
            })}
          </div>
          <ul className="legend">
            <li style={{"--c":"var(--ok)"}}>Present</li>
            <li style={{"--c":"#f0b44c"}}>Late (after 9:30 AM)</li>
            <li style={{"--c":"#b48cff"}}>On leave</li>
            <li style={{"--c":"var(--danger)"}}>Absent</li>
            <li style={{"--c":"#f472b6"}}>Holiday</li>
          </ul>
        </section>

        <aside id="dayPanel" className="card day-panel" aria-live="polite">
          <h2>{selD.toLocaleDateString([], { weekday:"long" })}</h2>
          <p className="muted day-date">{selD.toLocaleDateString([], { day:"numeric", month:"long", year:"numeric" })}</p>
          <span className={`pill ${STATUS_CLS[selInfo.st]}`}>{STATUS_LABEL[selInfo.st]}</span>

          {selInfo.st === "holiday" && (
            <dl className="day-rows"><div><dt>Holiday</dt><dd>{selInfo.name}</dd></div></dl>
          )}
          {selInfo.st === "leave" && (
            <dl className="day-rows">
              <div><dt>Leave type</dt><dd><span className={`chip ${typeCls(selInfo.lv.type)}`}>{selInfo.lv.type}</span></dd></div>
              <div><dt>Request</dt><dd>{selInfo.lv.status}</dd></div>
            </dl>
          )}
          {selRec && selInfo.st !== "holiday" && selInfo.st !== "leave" && (() => {
            const ci = new Date(selRec.checkIn), co = selRec.checkOut ? new Date(selRec.checkOut) : null;
            return (
              <dl className="day-rows">
                <div><dt>Check in</dt><dd><span className={selInfo.st==="late"?"t-late":"t-ok"}>{fmtTime(ci)}</span></dd></div>
                <div><dt>Check out</dt><dd>{co ? <span className="t-out">{fmtTime(co)}</span> : <span className="dash">Still working</span>}</dd></div>
                <div><dt>Hours worked</dt><dd>{co ? hoursHtml(co-ci) : <span className="dash">In progress</span>}</dd></div>
              </dl>
            );
          })()}
          {!selRec && selInfo.st !== "holiday" && selInfo.st !== "leave" && (
            <p className="day-note">
              {selInfo.st === "absent" ? "No check in was recorded for this day."
               : selInfo.st === "off"  ? "Weekend. No work scheduled."
               : isToday ? "You haven't checked in yet today."
               : "Nothing recorded for this day yet."}
            </p>
          )}
          {selRec && selInfo.st === "late" && <p className="day-note">Checked in after 9:30 AM.</p>}
          {selRec && selRec.checkOut && selInfo.st !== "late" && (() => {
            const ms = new Date(selRec.checkOut) - new Date(selRec.checkIn);
            return ms < WORK_HOURS*3600000 ? <p className="day-note">Worked less than the 9-hour target.</p> : null;
          })()}
        </aside>
      </div>
    </section>
  );
}
