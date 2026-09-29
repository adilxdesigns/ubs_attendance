import { dayKey, isWeekend, minsOf, parseDay, fmtTime, fmtHours, shortDate } from "../../data/utils";
import { loadAll, getLeaves } from "../../data/store";
import { LATE_AFTER, WORK_HOURS } from "../../data/constants";

export default function InsightsView() {
  const now = new Date(), ym = dayKey(now).slice(0, 7);
  const everything = Object.values(loadAll());
  const month = everything.filter(r => r.date.startsWith(ym));
  const done = month.filter(r => r.checkOut);
  const hrs = r => (new Date(r.checkOut) - new Date(r.checkIn)) / 3600000;
  const avg = done.length ? done.reduce((s, r) => s + hrs(r), 0) / done.length : 0;
  const late = month.filter(r => minsOf(r.checkIn) > LATE_AFTER).length;
  const onTime = month.length ? Math.round(((month.length - late) / month.length) * 100) + "%" : "--";
  const leaveDays = getLeaves().filter(l => (l.status==="Approved"||l.status==="Pending") && l.from.startsWith(ym)).reduce((s,l) => s+l.days, 0);

  // Bar chart – last 7 complete days
  const recent = everything.filter(r => r.checkOut).sort((a,b) => a.date.localeCompare(b.date)).slice(-7);

  // Highlights
  const longest  = done.length ? done.reduce((a,b) => hrs(b)>hrs(a)?b:a) : null;
  const earliest = month.length ? month.reduce((a,b) => minsOf(b.checkIn)<minsOf(a.checkIn)?b:a) : null;

  const card = (label, val) => (
    <div key={label} className="card stat">
      <span className="muted">{label}</span>
      <strong>{val}</strong>
    </div>
  );

  return (
    <section id="view-insights" className="view">
      <div className="page-head">
        <h1>Insights</h1>
        <p id="insightsSub" className="muted">{now.toLocaleDateString([], { month:"long", year:"numeric" })} so far.</p>
      </div>

      <section id="insightStats" className="stats four">
        {card("Days present", month.length)}
        {card("Average day", done.length ? fmtHours(avg*3600000) : "--")}
        {card("On-time arrival", onTime)}
        {card("Leave days", leaveDays)}
      </section>

      <div className="two-col wide-left">
        <section className="card chart">
          <h2>Hours worked, last 7 days</h2>
          <p className="muted small">Green bars reached the {WORK_HOURS}-hour target.</p>
          {recent.length === 0
            ? <p id="barsEmpty" className="empty">Complete a full day of check in and check out to see your hours here.</p>
            : <div id="bars" className="bars">
                {recent.map(r => {
                  const h = hrs(r);
                  const lbl = parseDay(r.date).toLocaleDateString([], { weekday:"short", day:"numeric" });
                  return (
                    <div key={r.date} className="bar">
                      <b>{h.toFixed(1)}h</b>
                      <div className="track">
                        <i className={h >= WORK_HOURS ? "met" : ""} style={{ height: `${Math.min(100, (h/10)*100)}%` }} />
                      </div>
                      <span>{lbl}</span>
                    </div>
                  );
                })}
              </div>
          }
        </section>

        <section className="card chart">
          <h2>This month's highlights</h2>
          <ul id="highlights" className="hl">
            <li><span>Longest day</span><span>{longest ? `${fmtHours(hrs(longest)*3600000)} on ${shortDate(longest.date)}` : "--"}</span></li>
            <li><span>Earliest check in</span><span>{earliest ? `${fmtTime(new Date(earliest.checkIn))} on ${shortDate(earliest.date)}` : "--"}</span></li>
            <li><span>Late arrivals</span><span>{late}</span></li>
            <li><span>Total hours</span><span>{done.length ? `${done.reduce((s,r)=>s+hrs(r),0).toFixed(1)} h` : "--"}</span></li>
          </ul>
        </section>
      </div>
    </section>
  );
}
