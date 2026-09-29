import { useApp } from "../../context/AppContext";
import { pad, fmtTime, fmtHours, dayInfo, dayKey, isWeekend, parseDay, minsOf, RING_CIRCUMFERENCE } from "../../data/utils";
import { WORK_HOURS, LATE_AFTER } from "../../data/constants";
import { loadAll } from "../../data/store";

const STATUS_LABEL = { present:"Present", late:"Late", absent:"Absent", leave:"On leave", off:"Weekend", holiday:"Holiday" };
const STATUS_CLS   = { present:"ok", late:"wait", absent:"bad", leave:"lv", off:"off", holiday:"hd" };

function hoursHtml(ms) {
  const h = ms / 3600000;
  return <span className={h < WORK_HOURS ? "hrs-low" : "hrs-ok"}>{fmtHours(ms)}</span>;
}

export default function CheckinView() {
  const { user, todayRec, history, busy, punch, confirmCheckout, setModal, clock, showToast } = useApp();

  const h = clock.getHours();
  const greeting = `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${user?.name?.split(" ")[0]}`;
  const dateLine = clock.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Progress ring
  const workedMs = todayRec?.checkIn
    ? (todayRec.checkOut ?? clock) - todayRec.checkIn
    : 0;
  const pct = Math.min(1, workedMs / (WORK_HOURS * 3600000));
  const offset = RING_CIRCUMFERENCE * (1 - pct);

  const state = !todayRec ? "none" : todayRec.checkOut ? "done" : "in";
  const btnLabel = busy ? "Please wait…" : state === "none" ? "Check in" : state === "in" ? "Check out" : "Done for today";
  const btnClass = "btn btn-lg " + (state === "in" ? "btn-primary is-out" : state === "done" ? "btn-primary is-done" : "btn-primary");

  function handlePunch() {
    if (busy || state === "done") return;
    if (state === "in") {
      setModal({
        title: "Check out now?",
        body: <p>You have worked {fmtHours(workedMs)} today. Your check-out time is recorded when you confirm.</p>,
        saveLabel: "Check out",
        onSave: () => { confirmCheckout(); },
      });
    } else {
      punch();
    }
  }

  // Recent rows
  const all = loadAll();
  const rows = [];
  for (let i = 0; i < 30 && rows.length < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (isWeekend(d)) continue;
    const key = dayKey(d), info = dayInfo(key, d);
    if (info.st === "none") continue;
    rows.push({ key, info, rec: all[key] });
  }

  return (
    <section id="view-checkin" className="view">
      <div className="page-head">
        <h1 id="greeting">{greeting}</h1>
        <p id="dateLine" className="muted">{dateLine}</p>
      </div>
      <div className="grid-2col">
        <section className="card punch" aria-label="Check in and check out">
          <div className="ring-wrap">
            <svg className="ring" viewBox="0 0 200 200" aria-hidden="true">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5b7cff"/>
                  <stop offset="100%" stopColor="#7b5ea7"/>
                </linearGradient>
                <linearGradient id="ringDone" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3a4"/>
                  <stop offset="100%" stopColor="#1aaa84"/>
                </linearGradient>
              </defs>
              <circle className="ring-track" cx="100" cy="100" r="88"/>
              <circle
                id="ringBar"
                className={`ring-bar${state === "done" ? " done" : ""}${state === "in" ? " checked-in" : ""}`}
                cx="100" cy="100" r="88"
                stroke={state === "done" ? "url(#ringDone)" : "url(#ringGrad)"}
                style={{ strokeDashoffset: offset }}
              />
            </svg>
            <div className="ring-center">
              <div id="clock" className="clock">
                {(clock.getHours() % 12 || 12)}:{pad(clock.getMinutes())}
              </div>
              <div id="clockSec" className="clock-sec">
                {pad(clock.getSeconds())} {clock.getHours() < 12 ? "AM" : "PM"}
              </div>
            </div>
          </div>

          <div id="statusPill" className={`pill${state === "in" ? " in" : state === "done" ? " done" : ""}`}>
            {state === "none" ? "Not checked in"
              : state === "in" ? `Working since ${fmtTime(todayRec.checkIn)}`
              : "Checked out"}
          </div>

          <button id="punchBtn" className={btnClass} type="button" disabled={busy || state === "done"} onClick={handlePunch}>
            {btnLabel}
          </button>
          <p id="punchHint" className="muted small">
            {state === "done" ? "Your day is complete. See you tomorrow." : "Your check-in time is recorded when you press the button."}
          </p>
        </section>

        <div className="side">
          <section className="stats" aria-label="Today">
            <div className="card stat"><span className="muted">Checked in</span><strong id="statIn">{fmtTime(todayRec?.checkIn)}</strong></div>
            <div className="card stat"><span className="muted">Checked out</span><strong id="statOut">{fmtTime(todayRec?.checkOut)}</strong></div>
            <div className="card stat"><span className="muted">Hours worked</span><strong id="statHours">{fmtHours(workedMs)}</strong></div>
          </section>

          <section className="card history">
            <h2>Recent attendance</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Status</th><th>Check in</th><th>Check out</th><th>Hours</th></tr></thead>
                <tbody id="historyBody">
                  {rows.length === 0
                    ? <tr><td colSpan={5} className="empty">No attendance yet.</td></tr>
                    : rows.map(({ key, info, rec }) => {
                        const d = parseDay(key).toLocaleDateString([], { weekday:"short", day:"numeric", month:"short" });
                        const ci = rec ? new Date(rec.checkIn) : null;
                        const co = rec?.checkOut ? new Date(rec.checkOut) : null;
                        return (
                          <tr key={key} className={info.st === "absent" ? "row-absent" : ""}>
                            <td>{d}</td>
                            <td><span className={`pill ${STATUS_CLS[info.st]}`}>{STATUS_LABEL[info.st]}</span></td>
                            <td>{ci ? <span className={info.st === "late" ? "t-late" : "t-ok"}>{fmtTime(ci)}</span> : <span className="dash">--</span>}</td>
                            <td>{co ? <span className="t-out">{fmtTime(co)}</span> : ci ? <span className="dash">Working</span> : <span className="dash">--</span>}</td>
                            <td>{co ? hoursHtml(co - ci) : ci ? <span className="dash">In progress</span> : <span className="dash">--</span>}</td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
