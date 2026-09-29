import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { dayKey, countDays, typeCls, shortDate, isActiveLeave, parseDay, isWeekend } from "../../data/utils";
import { getLeaves, saveLeaves } from "../../data/store";
import { LEAVE_TYPES } from "../../data/constants";

const LEAVE_CLS = { Approved:"ok", Pending:"wait", Rejected:"bad", Cancelled:"off" };

function usedDays(list, type) {
  return list.filter(l => l.type === type && isActiveLeave(l)).reduce((s, l) => s + l.days, 0);
}

export default function LeavesView() {
  const { showToast, addNotif } = useApp();
  const [leaveType, setLeaveType] = useState(Object.keys(LEAVE_TYPES)[0]);
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo]     = useState("");
  const [reason, setReason]       = useState("");
  const [error, setError]         = useState("");
  const [, forceUpdate] = useState(0);

  const list = getLeaves();
  const refresh = () => forceUpdate(n => n+1);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const fail = m => setError(m);
    if (!leaveFrom || !leaveTo) return fail("Choose a start date and an end date.");
    if (leaveFrom < dayKey()) return fail("The start date can't be in the past.");
    if (leaveTo < leaveFrom) return fail("The end date must be on or after the start date.");
    const days = countDays(leaveFrom, leaveTo);
    if (!days) return fail("Those dates fall on a weekend. Pick working days.");
    const leaves = getLeaves();
    if (leaves.some(l => isActiveLeave(l) && leaveFrom <= l.to && leaveTo >= l.from)) return fail("You already have a leave request in that period.");
    const left = LEAVE_TYPES[leaveType] - usedDays(leaves, leaveType);
    if (days > left) return fail(`Not enough balance. You have ${left} day${left===1?"":"s"} of ${leaveType.toLowerCase()} left.`);
    if (!reason.trim()) return fail("Add a short reason for your manager.");
    leaves.push({ id: Date.now(), type: leaveType, from: leaveFrom, to: leaveTo, days, reason: reason.trim(), status: "Pending" });
    saveLeaves(leaves);
    setLeaveFrom(""); setLeaveTo(""); setReason(""); setError("");
    refresh();
    showToast("Leave request sent to your manager.");
  }

  function cancelLeave(id) {
    const leaves = getLeaves(), l = leaves.find(x => String(x.id) === String(id));
    if (l) { l.status = "Cancelled"; saveLeaves(leaves); refresh(); showToast("Leave request cancelled."); }
  }

  const sorted = list.slice().sort((a,b) => b.from.localeCompare(a.from));

  return (
    <section id="view-leaves" className="view">
      <div className="page-head">
        <h1>Leaves</h1>
        <p className="muted">Check your balance, request time off and track approvals.</p>
      </div>

      <section id="balances" className="stats">
        {Object.entries(LEAVE_TYPES).map(([t, total]) => (
          <div key={t} className={`card stat ${typeCls(t)}`}>
            <span className={`chip ${typeCls(t)}`}>{t}</span>
            <strong>{total - usedDays(list, t)} <small>of {total} days left</small></strong>
          </div>
        ))}
      </section>

      <div className="two-col">
        <form id="leaveForm" className="card form-card" noValidate onSubmit={handleSubmit}>
          <h2>Request leave</h2>
          <label htmlFor="leaveType">Leave type</label>
          <select id="leaveType" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
            {Object.keys(LEAVE_TYPES).map(t => <option key={t}>{t}</option>)}
          </select>
          <label htmlFor="leaveFrom">From</label>
          <input id="leaveFrom" type="date" min={dayKey()} value={leaveFrom} onChange={e => { setLeaveFrom(e.target.value); if (leaveTo < e.target.value) setLeaveTo(e.target.value); }} />
          <label htmlFor="leaveTo">To</label>
          <input id="leaveTo" type="date" min={leaveFrom || dayKey()} value={leaveTo} onChange={e => setLeaveTo(e.target.value)} />
          <label htmlFor="leaveReason">Reason</label>
          <textarea id="leaveReason" placeholder="Tell your manager why you need this leave" value={reason} onChange={e => setReason(e.target.value)} />
          {error && <p id="leaveError" className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary" type="submit">Send request</button>
        </form>

        <section className="card history">
          <h2>Your requests</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th></th></tr></thead>
              <tbody id="leaveBody">
                {sorted.length === 0
                  ? <tr><td colSpan={5}><p id="leaveEmpty" className="empty">No leave requests yet.</p></td></tr>
                  : sorted.map(l => {
                      const range = l.from===l.to ? shortDate(l.from) : `${shortDate(l.from)} to ${shortDate(l.to)}`;
                      return (
                        <tr key={l.id} title={l.reason}>
                          <td><span className={`chip ${typeCls(l.type)}`}>{l.type}</span></td>
                          <td>{range}</td>
                          <td>{l.days}</td>
                          <td><span className={`pill ${LEAVE_CLS[l.status]}`}>{l.status}</span></td>
                          <td>{l.status==="Pending" && <button className="link-btn" type="button" onClick={() => cancelLeave(l.id)}>Cancel</button>}</td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
