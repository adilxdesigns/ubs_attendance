import { useState } from "react";
import { useApp } from "../context/AppContext";
import { COMPANY } from "../data/constants";

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid work email, like name@company.com.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login(email.trim().toLowerCase());
    }, 400);
  }

  return (
    <main className="login">
      <section className="login-brand">
        <div className="logo">
          <span className="logo-icon">📋</span>
          <span className="logo-text" style={{ color: "#fff" }}>AttendPro</span>
        </div>
        <div>
          <h1>Your workday, recorded accurately.</h1>
          <p>Check in when you start, check out when you finish. Your hours are saved automatically.</p>
          <div className="login-brand-badges" style={{ marginTop: "1.5rem" }}>
            {["Fibe", "PayServe", "ICICI", "HDFC First"].map(c => (
              <span key={c} className="badge-chip">{c}</span>
            ))}
          </div>
        </div>
        <p className="muted small">{COMPANY} · Chennai Office · Since 2019</p>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h2>Sign in</h2>
          <p className="muted">Use your work email and password.</p>

          <label htmlFor="email">Work email</label>
          <input
            id="email" type="email" autoComplete="username"
            placeholder="name@ubs.com" required
            value={email} onChange={e => setEmail(e.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password" type="password" autoComplete="current-password"
            placeholder="Enter your password" required
            value={password} onChange={e => setPassword(e.target.value)}
          />

          {error && (
            <p className="form-error" role="alert">{error}</p>
          )}

          <button id="loginBtn" className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="demo-note">
            <strong>Demo:</strong> enter any email and password to sign in.
            Use <code>admin@company.com</code> to open the admin panel.
            Your data stays in this browser only.
          </p>
        </form>
      </section>
    </main>
  );
}
