import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { store } from "../../data/store";
import { COMPANY, SHIFT, LOCATION } from "../../data/constants";

export default function ProfileView() {
  const { user, resetDemo, showToast } = useApp();
  const [phone, setPhone] = useState(() => store.get("ubs_phone") || "");
  const [phoneError, setPhoneError] = useState("");

  if (!user) return null;

  const empId = "UBS-" + (1000 + (user.email.length * 37) % 900);

  function savePhone(e) {
    e.preventDefault();
    const v = phone.trim();
    const n = v.replace(/\D/g, "").length;
    setPhoneError("");
    if (v && (!/^\+?[\d\s()-]+$/.test(v) || n < 7 || n > 15)) {
      setPhoneError("Enter a valid phone number with 7 to 15 digits.");
      return;
    }
    store.set("ubs_phone", v);
    showToast(v ? "Phone number saved." : "Phone number removed.");
  }

  return (
    <section id="view-profile" className="view">
      <div className="page-head">
        <h1>Profile</h1>
        <p className="muted">Your details as they appear in company records.</p>
      </div>
      <section className="card profile">
        <div className="pf-head">
          <div id="pfAvatar" className="avatar lg" aria-hidden="true">{user.initials}</div>
          <div>
            <h2 id="pfName">{user.name}</h2>
            <p id="pfEmail" className="muted">{user.email}</p>
          </div>
        </div>
        <dl className="details">
          <div><dt>Employee ID</dt><dd id="pfId">{empId}</dd></div>
          <div><dt>Company</dt><dd>{COMPANY}</dd></div>
          <div><dt>Department</dt><dd>BPO</dd></div>
          <div><dt>Role</dt><dd>Tele Caller</dd></div>
          <div><dt>Reporting manager</dt><dd>Priya Sharma (HR)</dd></div>
          <div><dt>Shift</dt><dd>{SHIFT}</dd></div>
          <div><dt>Work location</dt><dd>{LOCATION}</dd></div>
          <div><dt>Phone</dt><dd id="pfPhone">{store.get("ubs_phone") || "Not added"}</dd></div>
        </dl>

        <form id="phoneForm" className="pf-form" noValidate onSubmit={savePhone}>
          <h2>Phone number</h2>
          <p className="muted small">Update your contact number.</p>
          <label htmlFor="phone">Phone number</label>
          <input id="phone" type="tel" maxLength={20} autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
          {phoneError && <p id="phoneError" className="form-error" role="alert">{phoneError}</p>}
          <button className="btn btn-primary btn-sm" type="submit">Save phone</button>
        </form>

        <div className="pf-form danger-zone">
          <h2>Demo data</h2>
          <p className="muted small">Clear everything saved in this browser and start fresh.</p>
          <button id="resetBtn" className="btn btn-no btn-sm" type="button" onClick={resetDemo}>Reset demo data</button>
        </div>
      </section>
    </section>
  );
}
