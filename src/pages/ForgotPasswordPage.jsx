import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!email.trim()) {
      setError("Моля, въведи имейл адрес.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      setStatus(res?.data || "Ако имейлът съществува, е изпратен линк за смяна на паролата.");
      setEmail("");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно изпращане на имейл за възстановяване.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout auth-layout--single">
      <aside className="auth-panel">
        <h1>Смени паролата сигурно.</h1>
        <p>
          Въведи имейла на профила и ще изпратим защитен линк за нулиране.
        </p>
      </aside>

      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Забравена парола</h2>
        <p className="muted">Линкът за смяна ще бъде изпратен в пощата ти.</p>

        {error && <p className="error-msg">{error}</p>}
        {status && <p className="success-msg">{status}</p>}

        <input
          className="input"
          type="email"
          placeholder="Имейл адрес"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Изпращане..." : "Изпрати линк"}
        </button>

        <div className="auth-footer">
          <Link to="/login" className="link">Назад към вход</Link>
        </div>
      </form>
    </div>
  );
}
