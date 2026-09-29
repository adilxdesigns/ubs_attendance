export default function Toast({ msg, isError }) {
  return (
    <div id="toast" className={`toast${isError ? " error" : ""}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}
