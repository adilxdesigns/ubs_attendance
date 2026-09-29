import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";

export default function Modal() {
  const { modal, setModal } = useApp();
  const [err, setErr] = useState("");
  const firstRef = useRef(null);

  useEffect(() => {
    if (modal) {
      setErr("");
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [modal]);

  useEffect(() => {
    function handler(e) {
      if (e.key === "Escape") setModal(null);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setModal]);

  if (!modal) return null;
  const { title, body, saveLabel = "Save", onSave, onCancel } = modal;

  function handleSave(e) {
    e.preventDefault();
    const result = onSave && onSave();
    if (typeof result === "string") {
      setErr(result);
    } else {
      setModal(null);
    }
  }

  return (
    <div id="modal" className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="mTitle">
        <h2 id="mTitle">{title}</h2>
        <form id="mForm" noValidate onSubmit={handleSave}>
          <div id="mBody" ref={firstRef} tabIndex={-1}>
            {body}
          </div>
          {err && <p id="mErr" className="form-error" role="alert">{err}</p>}
          <div className="modal-actions">
            <button id="mCancel" className="btn btn-ghost" type="button" onClick={() => { onCancel?.(); setModal(null); }}>Cancel</button>
            <button id="mSave" className="btn btn-primary" type="submit">{saveLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
