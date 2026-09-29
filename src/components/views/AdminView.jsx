import { useState, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { dayKey, isWeekend, parseDay, fmtMin, fmtTime, fmtHours, shortDate, initials, typeCls, isActiveLeave, staffDay, loadStaff, rnd, jget, countDays } from "../../data/utils";
import { store, getLeaves, saveLeaves, teamLeaves, saveTeamLeaves, getRegs, getHolidays, getAudit, logAudit, addNotif } from "../../data/store";
import { DEPTS, BPO_CLIENTS, LEAVE_TYPES, LATE_AFTER, WORK_HOURS } from "../../data/constants";

const S_LABEL = { present:"Present", late:"Late", absent:"Absent", leave:"On leave", off:"Weekend", holiday:"Holiday", inactive:"Inactive", none:"Not in yet" };
const S_CLS   = { present:"ok", late:"wait", absent:"bad", leave:"lv", off:"off", holiday:"hd", inactive:"off", none:"off" };

function Person({ e }) {
  const ini = initials(e.name);
  return (
    <div className="person">
      <span className="mini-av">{ini}</span>
      <div>
        <strong>{e.name}</strong>
        <small>{e.email}</small>
      </div>
    </div>
  );
}

function InCell({ r }) {
  if (r.inM == null) return <span className="dash">--</span>;
  return <span className={r.st === "late" ? "t-late" : "t-ok"}>{fmtMin(r.inM)}</span>;
}

function hoursHtml(ms) {
  const h = ms/3600000;
  return <span className={h < WORK_HOURS ? "hrs-low" : "hrs-ok"}>{fmtHours(ms)}</span>;
}

function allRequests(empName) {
  return [
    ...getLeaves().map(l => ({ ...l, src:"me", name: empName || "Demo Employee" })),
    ...teamLeaves().map(l => {
      const staff = loadStaff();
      const emp = staff.find(s => s.id === l.emp);
      return { ...l, src:"team", name: emp ? emp.name : "Unknown" };
    }),
    ...getRegs().map(g => ({
      id: g.id, src:"reg", type:"Regularization",
      from: g.date, to: g.date, days:"--",
      reason: `${g.field==="in"?"Check-in":"Check-out"} ${fmtMin(g.min)}: ${g.reason}`,
      status: g.status, name: empName || "Demo Employee",
    })),
  ];
}

// ===== SUB-VIEWS =====

function AdminOverview({ staff, user, setAdminSub, showToast }) {
  const today = dayKey(), rows = staff.filter(e => e.active).map(e => ({ e, r: staffDay(e, today) }));
  const off = isWeekend(new Date()) || (rows.length > 0 && rows.every(x => x.r.st === "holiday"));
  const c = st => off ? 0 : rows.filter(x => x.r.st === st).length;
  const ontime = c("present"), late = c("late"), leave = c("leave"), away = off ? 0 : rows.filter(e => e.active).length - ontime - late - leave;
  const total = rows.length || 1, inNow = ontime + late, pct = Math.round((inNow/total)*100);

  let acc = 0;
  const stops = [[ontime,"var(--ok)"],[late,"#f0b44c"],[leave,"#b48cff"],[away,"var(--danger)"]].map(([n,col]) => {
    const a = acc; acc += (n/total)*100; return `${col} ${a}% ${acc}%`;
  }).join(",");

  const lateRows = rows.filter(x => x.r.st === "late" && !off);
  const empName = store.get("ubs_emp_name") || user?.name || "Demo Employee";
  const pending = allRequests(empName).filter(r => r.status === "Pending");

  // 7-day trend
  const act = staff.filter(e => e.active);
  const hols = getHolidays(), days = [];
  for (let i = 0; days.length < 7 && i < 25; i++) {
    const d = new Date(); d.setDate(d.getDate()-i);
    if (!isWeekend(d) && !hols.some(h => h.date === dayKey(d))) days.push(d);
  }
  days.reverse();
  const trendData = days.map(d => {
    let n=0,l=0; const k=dayKey(d);
    act.forEach(e => { const s=staffDay(e,k).st; if(s==="present"||s==="late")n++; if(s==="late")l++; });
    return { d, n, l, pct: act.length ? Math.round((n/act.length)*100) : 0 };
  });
  const avg7 = trendData.length ? Math.round(trendData.reduce((s,x)=>s+x.pct,0)/trendData.length) : 0;
  const lateWk = trendData.reduce((s,x)=>s+x.l,0);
  const pc = allRequests(empName).filter(r=>r.status==="Pending").length;

  // Dept breakdown
  const deptBreak = DEPTS.map(dp => {
    const l = act.filter(e => e.dept === dp);
    if (!l.length) return null;
    const s = l.map(e => staffDay(e, today).st);
    const n = st => off ? 0 : s.filter(x => x===st).length;
    const on=n("present"), lt=n("late"), lv=n("leave"), aw=off?0:l.length-on-lt-lv;
    const w = x => (x/l.length)*100;
    return { dp, l, on, lt, lv, aw, w };
  }).filter(Boolean);

  return (
    <>
      <section id="admGlance" className="card glance">
        <div className="donut" style={{ background: `conic-gradient(${off||!rows.length?"var(--line) 0 100%":stops})` }}>
          <div><strong>{off?"--":pct+"%"}</strong><span>checked in</span></div>
        </div>
        <div className="glance-text">
          <h2>Today at a glance</h2>
          <p className="muted">{new Date().toLocaleDateString([],{weekday:"long",day:"numeric",month:"long"})}. {off?"No work is scheduled today.":(`${inNow} of ${rows.length} active staff are in.`)}</p>
          <ul className="legend big">
            {[["On time",ontime,"var(--ok)"],["Late",late,"#f0b44c"],["On leave",leave,"#b48cff"],["Not in",away,"var(--danger)"]].map(([lbl,n,col])=>(
              <li key={lbl} style={{"--c":col}}><b>{n}</b> {lbl}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="admStats" className="stats four">
        {[["Active employees",act.length,`${staff.length-act.length} inactive`],
          ["7-day attendance",avg7+"%","average checked in",avg7>=90?"n-ok":avg7>=75?"n-late":"n-bad"],
          ["Late arrivals",lateWk,"in the last 7 working days",lateWk?"n-late":"n-ok"],
          ["Pending approvals",pc,"leave and corrections",pc?"n-late":"n-ok"]
        ].map(([l,v,sub,cls=""])=>(
          <div key={l} className="card stat kpi">
            <span className="muted">{l}</span>
            <strong className={cls}>{v}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </section>

      <div className="two-col even">
        <section className="card chart">
          <h2>Attendance, last 7 working days</h2>
          <p id="admTrendNote" className="muted small">{act.length?`Average ${avg7}% of active staff. Green days reached 90% or more.`:""}</p>
          <div id="admTrend" className="bars trend">
            {act.length ? trendData.map(x=>(
              <div key={x.d.toISOString()} className="bar">
                <b>{x.pct}%</b>
                <div className="track"><i className={x.pct>=90?"met":""} style={{height:`${x.pct}%`}}/></div>
                <span>{x.d.toLocaleDateString([],{weekday:"short",day:"numeric"})}</span>
              </div>
            )) : <p className="empty">No active employees to chart.</p>}
          </div>
        </section>
        <section className="card chart">
          <h2>By department today</h2>
          <ul className="legend">
            <li style={{"--c":"var(--ok)"}}>On time</li>
            <li style={{"--c":"#f0b44c"}}>Late</li>
            <li style={{"--c":"#b48cff"}}>On leave</li>
            <li style={{"--c":"var(--danger)"}}>Not in</li>
          </ul>
          <div id="admDept" className="dept-list">
            {deptBreak.map(({dp,l,on,lt,lv,aw,w})=>(
              <div key={dp} className="dp">
                <div className="dp-h"><span>{dp}</span><span>{on+lt} of {l.length} in</span></div>
                <div className="stack">
                  <i style={{width:`${w(on)}%`,background:"var(--ok)"}}/>
                  <i style={{width:`${w(lt)}%`,background:"#f0b44c"}}/>
                  <i style={{width:`${w(lv)}%`,background:"#b48cff"}}/>
                  <i style={{width:`${w(aw)}%`,background:"var(--danger)"}}/>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="two-col even">
        <section className="card history">
          <h2>Late today</h2>
          <ul id="admLate" className="hl">
            {lateRows.length
              ? lateRows.map(x=><li key={x.e.id}><span>{x.e.name}</span><span className="t-late">{fmtMin(x.r.inM)}</span></li>)
              : <li><span className="muted">{off?"No work today.":"No late arrivals so far today."}</span></li>}
          </ul>
        </section>
        <section className="card history">
          <h2>Waiting for approval</h2>
          <ul id="admPending" className="hl">
            {pending.length
              ? pending.slice(0,4).map(r=><li key={r.id}><span>{r.name}</span><span className={`chip ${typeCls(r.type)}`}>{r.type}</span></li>)
              : <li><span className="muted">All caught up. No requests are waiting.</span></li>}
          </ul>
          <button id="goApprovals" className="btn btn-ghost btn-sm card-action" type="button" onClick={()=>setAdminSub("approvals")}>Review requests</button>
        </section>
      </div>
    </>
  );
}

function AdminEmployees({ staff, reloadStaff, showToast, setModal, user }) {
  const [search, setSearch] = useState("");
  const [dept, setDept]     = useState("all");
  const today = dayKey();
  const list = staff.filter(e => (dept==="all"||e.dept===dept) && (!search||(e.name+e.email).toLowerCase().includes(search.toLowerCase())));

  function addEmployee() {
    setModal({
      title: "Add employee",
      saveLabel: "Add employee",
      body: (
        <div>
          <label htmlFor="mName">Full name</label>
          <input id="mName" type="text" maxLength={60} autoComplete="off" />
          <label htmlFor="mEmail">Work email</label>
          <input id="mEmail" type="email" maxLength={80} autoComplete="off" placeholder="name@ubs.com" />
          <label htmlFor="mDept">Department</label>
          <select id="mDept">{DEPTS.map(d=><option key={d}>{d}</option>)}</select>
          <label htmlFor="mClient">Client (BPO only)</label>
          <select id="mClient"><option value="">N/A</option>{BPO_CLIENTS.map(c=><option key={c}>{c}</option>)}</select>
          <label htmlFor="mRole">Role</label>
          <input id="mRole" type="text" maxLength={50} placeholder="e.g. Tele Caller" />
        </div>
      ),
      onSave: () => {
        const name  = document.getElementById("mName")?.value.trim().replace(/\s+/g," ");
        const email = document.getElementById("mEmail")?.value.trim().toLowerCase();
        const dp    = document.getElementById("mDept")?.value;
        const client= document.getElementById("mClient")?.value || null;
        const role  = document.getElementById("mRole")?.value.trim() || "Tele Caller";
        const cur   = loadStaff();
        if (!name || name.length < 2) return "Enter the employee's full name.";
        if (!/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid work email.";
        if (cur.some(s => s.email.toLowerCase() === email)) return "An employee with this email already exists.";
        const extra = jget("ubs_new_staff","[]");
        extra.push({ id: Math.max(...cur.map(s=>s.id))+1, name, dept:dp, client:dp==="BPO"?client:null, role, email, joined:dayKey() });
        store.set("ubs_new_staff", JSON.stringify(extra));
        logAudit(user?.email||"admin", `Added employee ${name} (${dp})`);
        reloadStaff();
        showToast("Employee added.");
      },
    });
  }

  function toggleEmployee(e) {
    const act = e.active;
    setModal({
      title: act ? "Deactivate employee" : "Reactivate employee",
      saveLabel: act ? "Deactivate" : "Reactivate",
      body: (
        <div>
          <p>{e.name} {act ? "will be greyed out and left out of the daily counts. Their records are kept." : "will be counted in the daily totals again."}</p>
          <label htmlFor="mReason">Reason <span className="muted">(required)</span></label>
          <textarea id="mReason" maxLength={200} placeholder="Why is this change needed?" />
        </div>
      ),
      onSave: () => {
        const reason = document.getElementById("mReason")?.value.trim();
        if (!reason) return "Enter a reason.";
        const off = jget("ubs_inactive","[]");
        store.set("ubs_inactive", JSON.stringify(act ? [...off, e.id] : off.filter(x=>x!==e.id)));
        logAudit(user?.email||"admin", `${act?"Deactivated":"Reactivated"} employee ${e.name}`, reason);
        reloadStaff();
        showToast(act ? "Employee deactivated." : "Employee reactivated.");
      },
    });
  }

  return (
    <>
      <div className="toolbar">
        <input id="empSearch" type="search" placeholder="Search by name or email" aria-label="Search employees" value={search} onChange={e=>setSearch(e.target.value)} />
        <select id="empDept" aria-label="Department" value={dept} onChange={e=>setDept(e.target.value)}>
          <option value="all">All departments</option>
          {DEPTS.map(d=><option key={d}>{d}</option>)}
        </select>
        <button id="empAdd" className="btn btn-primary btn-sm" type="button" onClick={addEmployee}>Add employee</button>
      </div>
      <section className="card history">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Client</th><th>Today</th><th>Check in</th><th>Actions</th></tr></thead>
            <tbody id="empBody">
              {list.length === 0
                ? <tr><td colSpan={6}><p id="empEmpty" className="empty">No employees match your search.</p></td></tr>
                : list.map(e => {
                    const r = staffDay(e, today);
                    return (
                      <tr key={e.id} className={e.active?"":"row-inactive"}>
                        <td><Person e={e}/></td>
                        <td>{e.dept}</td>
                        <td>{e.client || <span className="muted">—</span>}</td>
                        <td><span className={`pill ${S_CLS[r.st]}`}>{S_LABEL[r.st]}</span></td>
                        <td><InCell r={r}/></td>
                        <td>
                          <button className={`btn ${e.active?"btn-no":"btn-ok"} btn-sm`} type="button" onClick={()=>toggleEmployee(e)}>
                            {e.active?"Deactivate":"Reactivate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function AdminApprovals({ user, showToast, reloadStaff, refreshPendingCount }) {
  const [filter, setFilter] = useState("Pending");
  const empName = store.get("ubs_emp_name") || user?.name || "Demo Employee";
  const list = allRequests(empName).filter(r => filter==="all"||r.status===filter)
    .sort((a,b) => (a.status==="Pending"?0:1)-(b.status==="Pending"?0:1)||b.from.localeCompare(a.from));
  const cls = { Approved:"ok", Pending:"wait", Rejected:"bad", Cancelled:"off" };
  const [, forceUpdate] = useState(0);

  function decide(r, act) {
    if (r.src === "reg") {
      const regs = getRegs(), g = regs.find(x => String(x.id)===String(r.id));
      if (!g) return;
      g.status = act;
      store.set("ubs_regs", JSON.stringify(regs));
      addNotif(`Your correction for ${shortDate(g.date)} was ${act.toLowerCase()}`);
      logAudit(user?.email||"admin", `Correction ${act.toLowerCase()}: ${shortDate(g.date)}`, g.reason);
    } else {
      const src = r.src==="me" ? getLeaves() : teamLeaves();
      const l = src.find(x => String(x.id)===String(r.id));
      if (!l) return;
      l.status = act;
      r.src==="me" ? saveLeaves(src) : saveTeamLeaves(src);
      if (r.src==="me") addNotif(`Your ${l.type.toLowerCase()} was ${act.toLowerCase()}`);
      logAudit(user?.email||"admin", `Leave ${act.toLowerCase()}: ${r.name}, ${r.type}, ${shortDate(r.from)}`);
    }
    refreshPendingCount();
    forceUpdate(n=>n+1);
    showToast(act==="Approved" ? "Approved." : "Rejected.");
  }

  return (
    <>
      <div className="toolbar">
        <select id="apFilter" aria-label="Filter requests" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="all">All requests</option>
        </select>
      </div>
      <section className="card history">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody id="apBody">
              {list.length === 0
                ? <tr><td colSpan={7}><p id="apEmpty" className="empty">No requests here.</p></td></tr>
                : list.map(r => {
                    const range = r.from===r.to ? shortDate(r.from) : `${shortDate(r.from)} to ${shortDate(r.to)}`;
                    return (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong></td>
                        <td><span className={`chip ${typeCls(r.type)}`}>{r.type}</span></td>
                        <td>{range}</td><td>{r.days}</td>
                        <td className="reason" title={r.reason||""}>{r.reason||"--"}</td>
                        <td><span className={`pill ${cls[r.status]}`}>{r.status}</span></td>
                        <td>
                          {r.status==="Pending" && (
                            <div className="actions">
                              <button className="btn btn-sm btn-ok" type="button" onClick={()=>decide(r,"Approved")}>Approve</button>
                              <button className="btn btn-sm btn-no" type="button" onClick={()=>decide(r,"Rejected")}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function AdminAttendance({ staff, user, showToast, setModal }) {
  const [date, setDate]   = useState(dayKey());
  const [emp, setEmp]     = useState("all");
  const [status, setStatus] = useState("all");

  let list = [];
  if (emp === "all") {
    list = staff.map(e => ({ e, key: date, r: staffDay(e, date) }));
  } else {
    const e = staff.find(s => String(s.id)===emp);
    for (let i=0; i<30&&list.length<14; i++) {
      const d=new Date(); d.setDate(d.getDate()-i);
      if (isWeekend(d)) continue;
      const key=dayKey(d), r=staffDay(e,key);
      if (r.st!=="none") list.push({ e, key, r });
    }
  }
  list = list.filter(x => status==="all"||x.r.st===status);

  function editAtt(e, key) {
    const r = staffDay(e, key);
    const hm = m => m==null?"":String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
    const un = v => { if(!v)return null; const[h,m]=v.split(":").map(Number); return h*60+m; };
    setModal({
      title: "Edit attendance",
      saveLabel: "Save changes",
      body: (
        <div>
          <p className="muted small">{e.name}, {shortDate(key)}</p>
          <label htmlFor="mIn">Check-in time</label>
          <input id="mIn" type="time" defaultValue={hm(r.inM)} />
          <label htmlFor="mOut">Check-out time</label>
          <input id="mOut" type="time" defaultValue={hm(r.outM)} />
          <label htmlFor="mSt">Status</label>
          <select id="mSt" defaultValue={r.st}>
            {["present","late","absent","leave"].map(s=><option key={s} value={s}>{S_LABEL[s]}</option>)}
          </select>
          <label htmlFor="mReason">Reason <span className="muted">(required)</span></label>
          <textarea id="mReason" maxLength={200} placeholder="Why is this change needed?" />
        </div>
      ),
      onSave: () => {
        const st=document.getElementById("mSt")?.value;
        const reason=document.getElementById("mReason")?.value.trim();
        const inM=un(document.getElementById("mIn")?.value);
        const outM=un(document.getElementById("mOut")?.value);
        if (!reason) return "Enter a reason for this change.";
        if (st!=="absent"&&st!=="leave"&&inM==null) return "Add a check-in time.";
        if (inM!=null&&outM!=null&&outM<=inM) return "Check-out must be after check-in.";
        const n = st==="absent"||st==="leave" ? {st,inM:null,outM:null} : {st,inM,outM};
        const ed = JSON.parse(store.get("ubs_edits")||"{}");
        ed[e.id+"|"+key] = n;
        store.set("ubs_edits", JSON.stringify(ed));
        logAudit(user?.email||"admin", `${e.name}, ${shortDate(key)}: status → ${S_LABEL[st]}`, reason);
        showToast("Attendance updated.");
      },
    });
  }

  return (
    <>
      <div className="toolbar">
        <input id="atDate" type="date" max={dayKey()} value={date} disabled={emp!=="all"} onChange={e=>setDate(e.target.value)} aria-label="Date" />
        <select id="atEmp" aria-label="Employee" value={emp} onChange={e=>setEmp(e.target.value)}>
          <option value="all">All employees</option>
          {staff.map(s=><option key={s.id} value={s.id}>{s.name}{s.active?"":" (inactive)"}</option>)}
        </select>
        <select id="atStatus" aria-label="Status" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="leave">On leave</option>
        </select>
      </div>
      <section className="card history">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Date</th><th>Status</th><th>Check in</th><th>Check out</th><th>Hours</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody id="atBody">
              {list.length===0
                ? <tr><td colSpan={7}><p id="atEmpty" className="empty">No records match these filters.</p></td></tr>
                : list.map(({e,key,r})=>{
                    const d = parseDay(key).toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"});
                    const cout = r.outM!=null?<span className="t-out">{fmtMin(r.outM)}</span>:r.inM!=null?<span className="dash">Working</span>:<span className="dash">--</span>;
                    const hrs = r.outM!=null ? <span className={(r.outM-r.inM)/60<WORK_HOURS?"hrs-low":"hrs-ok"}>{fmtHours((r.outM-r.inM)*60000)}</span> : r.inM!=null?<span className="dash">In progress</span>:<span className="dash">--</span>;
                    const canEdit = !["off","holiday","inactive"].includes(r.st) && key<=dayKey();
                    return (
                      <tr key={e.id+key} className={r.st==="absent"?"row-absent":r.st==="inactive"?"row-inactive":""}>
                        <td><Person e={e}/></td>
                        <td>{d}</td>
                        <td><span className={`pill ${S_CLS[r.st]}`}>{S_LABEL[r.st]}</span>{r.edited&&<span className="badge">Edited</span>}</td>
                        <td><InCell r={r}/></td>
                        <td>{cout}</td>
                        <td>{hrs}</td>
                        <td>{canEdit&&<button className="btn btn-ghost btn-sm" type="button" onClick={()=>editAtt(e,key)}>Edit</button>}</td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function AdminHolidays({ user, showToast }) {
  const [hdDate, setHdDate] = useState("");
  const [hdName, setHdName] = useState("");
  const [hdError, setHdError] = useState("");
  const [, forceUpdate] = useState(0);
  const hols = getHolidays().sort((a,b)=>a.date.localeCompare(b.date));

  function addHoliday(e) {
    e.preventDefault(); setHdError("");
    if (!hdDate) return setHdError("Choose the holiday date.");
    if (!hdName.trim()) return setHdError("Enter the holiday name.");
    if (isWeekend(parseDay(hdDate))) return setHdError("That date is a weekend. Pick a working day.");
    if (hols.some(h=>h.date===hdDate)) return setHdError("A holiday is already set on that date.");
    const list = [...hols, { date:hdDate, name:hdName.trim() }];
    store.set("ubs_holidays", JSON.stringify(list));
    logAudit(user?.email||"admin", `Added holiday: ${hdName} on ${shortDate(hdDate)}`);
    setHdDate(""); setHdName(""); forceUpdate(n=>n+1);
    showToast("Holiday added.");
  }

  function removeHoliday(date) {
    const h = hols.find(x=>x.date===date);
    store.set("ubs_holidays", JSON.stringify(hols.filter(x=>x.date!==date)));
    logAudit(user?.email||"admin", `Removed holiday: ${h?.name} on ${shortDate(date)}`);
    forceUpdate(n=>n+1);
    showToast("Holiday removed.");
  }

  return (
    <div className="two-col">
      <form id="hdForm" className="card form-card" noValidate onSubmit={addHoliday}>
        <h2>Add holiday</h2>
        <label htmlFor="hdDate">Date</label>
        <input id="hdDate" type="date" value={hdDate} onChange={e=>setHdDate(e.target.value)} />
        <label htmlFor="hdName">Holiday name</label>
        <input id="hdName" type="text" maxLength={60} placeholder="e.g. Pongal" value={hdName} onChange={e=>setHdName(e.target.value)} />
        {hdError && <p id="hdError" className="form-error" role="alert">{hdError}</p>}
        <button className="btn btn-primary" type="submit">Add holiday</button>
      </form>
      <section className="card history">
        <h2>Company holidays</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Name</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody id="hdBody">
              {hols.length===0
                ? <tr><td colSpan={3}><p id="hdEmpty" className="empty">No holidays yet.</p></td></tr>
                : hols.map(h=>(
                    <tr key={h.date}>
                      <td>{parseDay(h.date).toLocaleDateString([],{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</td>
                      <td>{h.name}</td>
                      <td><button className="btn btn-no btn-sm" type="button" onClick={()=>removeHoliday(h.date)}>Remove</button></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AdminReports({ staff, user, showToast }) {
  const [rpMonth, setRpMonth] = useState(dayKey().slice(0,7));
  const pad = n => String(n).padStart(2,"0");

  function reportData(ym) {
    const last = new Date(+ym.slice(0,4), +ym.slice(5), 0).getDate(), t = dayKey();
    return staff.map(e => {
      const c = { e, present:0, late:0, absent:0, leave:0, hrs:0 };
      for (let n=1; n<=last && `${ym}-${pad(n)}`<=t; n++) {
        const r = staffDay(e, `${ym}-${pad(n)}`);
        if (r.st==="present"||r.st==="late") { c.present++; if(r.st==="late")c.late++; if(r.inM!=null&&r.outM!=null)c.hrs+=(r.outM-r.inM)/60; }
        else if (r.st==="absent") c.absent++;
        else if (r.st==="leave")  c.leave++;
      }
      return c;
    });
  }
  const bad = !/^\d{4}-(0[1-9]|1[0-2])$/.test(rpMonth) ? "Pick a valid month."
            : rpMonth > dayKey().slice(0,7) ? "That month hasn't started yet." : "";
  const rows = bad ? [] : reportData(rpMonth);

  function downloadCSV() {
    if (bad || !rows.length) return showToast("Pick a month with data first.", true);
    const cell = v => { let s=String(v); if(/^[=+\-@\t\r]/.test(s))s="'"+s; return '"'+s.replace(/"/g,'""')+'"'; };
    const data = [["Employee","Email","Department","Client","Role","Status","Days present","Late days","Absent days","Leave days","Total hours"]]
      .concat(rows.map(c=>[c.e.name,c.e.email,c.e.dept,c.e.client||"",c.e.role||"",c.e.active?"Active":"Inactive",c.present,c.late,c.absent,c.leave,c.hrs.toFixed(1)]));
    const blob = new Blob(["\uFEFF"+data.map(r=>r.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`ubs-attendance-${rpMonth}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    showToast("CSV downloaded.");
  }

  return (
    <>
      <div className="toolbar">
        <input id="rpMonth" type="month" aria-label="Month" value={rpMonth} onChange={e=>setRpMonth(e.target.value)} />
        <button id="rpPrint" className="btn btn-ghost" type="button" onClick={()=>window.print()}>Print</button>
        <button id="rpCsv" className="btn btn-ghost" type="button" disabled={!!bad} onClick={downloadCSV}>Download CSV</button>
      </div>
      <h2 id="rpTitle" className="rp-title">
        {bad ? "Attendance report" : `Attendance report, ${new Date(+rpMonth.slice(0,4), +rpMonth.slice(5)-1, 1).toLocaleDateString([],{month:"long",year:"numeric"})}`}
      </h2>
      {bad && <p id="rpError" className="form-error" role="alert">{bad}</p>}
      <section className="card history">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Client</th><th>Days present</th><th>Late days</th><th>Absent days</th><th>Leave days</th><th>Total hours</th></tr></thead>
            <tbody id="rpBody">
              {rows.length===0
                ? <tr><td colSpan={8}><p id="rpEmpty" className="empty">Choose a month to see the report.</p></td></tr>
                : rows.map(c=>(
                    <tr key={c.e.id} className={c.e.active?"":"row-inactive"}>
                      <td><Person e={c.e}/></td>
                      <td>{c.e.dept}</td>
                      <td>{c.e.client||<span className="muted">—</span>}</td>
                      <td>{c.present}</td><td>{c.late}</td><td>{c.absent}</td><td>{c.leave}</td>
                      <td>{c.hrs.toFixed(1)} h</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <p className="muted small note">Days present include late days. Holidays and weekends are never counted as absent.</p>
      </section>
    </>
  );
}

function AdminAudit() {
  const a = getAudit();
  return (
    <section className="card history">
      <h2>Audit log</h2>
      <p className="muted small">A read-only record of every admin change.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date and time</th><th>Admin</th><th>What changed</th><th>Reason</th></tr></thead>
          <tbody id="auBody">
            {a.length===0
              ? <tr><td colSpan={4}><p id="auEmpty" className="empty">No changes yet.</p></td></tr>
              : a.map((x,i)=>(
                  <tr key={i}>
                    <td className="nowrap">{new Date(x.t).toLocaleString([],{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"})}</td>
                    <td>{x.who}</td>
                    <td>{x.what}</td>
                    <td>{x.reason||"--"}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ===== MAIN ADMIN VIEW =====
export default function AdminView() {
  const { user, adminSub, setAdminSub, staff, reloadStaff, showToast, setModal, refreshPendingCount } = useApp();

  if (!user?.isAdmin) return <p className="empty">You don't have access to this page.</p>;

  const SUBS = ["overview","employees","approvals","attendance","holidays","reports","audit"];
  const LABELS = ["Overview","Employees","Approvals","Attendance","Holidays","Reports","Audit log"];
  const pendingCount = allRequests(user?.name||"").filter(r=>r.status==="Pending").length;

  return (
    <section id="view-admin" className="view">
      <div className="page-head">
        <h1>Admin</h1>
        <p className="muted">Track your team's attendance and handle leave requests.</p>
      </div>

      <div className="seg" role="group" aria-label="Admin sections">
        {SUBS.map((s,i)=>(
          <button key={s} className={`seg-btn${adminSub===s?" active":""}`} data-sub={s} type="button" onClick={()=>setAdminSub(s)}>
            {s==="approvals"&&pendingCount>0 ? `Approvals (${pendingCount})` : LABELS[i]}
          </button>
        ))}
      </div>

      {adminSub==="overview"    && <AdminOverview   staff={staff} user={user} setAdminSub={setAdminSub} showToast={showToast}/>}
      {adminSub==="employees"   && <AdminEmployees  staff={staff} reloadStaff={reloadStaff} showToast={showToast} setModal={setModal} user={user}/>}
      {adminSub==="approvals"   && <AdminApprovals  user={user} showToast={showToast} reloadStaff={reloadStaff} refreshPendingCount={refreshPendingCount}/>}
      {adminSub==="attendance"  && <AdminAttendance staff={staff} user={user} showToast={showToast} setModal={setModal}/>}
      {adminSub==="holidays"    && <AdminHolidays   user={user} showToast={showToast}/>}
      {adminSub==="reports"     && <AdminReports    staff={staff} user={user} showToast={showToast}/>}
      {adminSub==="audit"       && <AdminAudit/>}
    </section>
  );
}
