import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import "./ForgotPasswordPage.css";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPasswordPage() {
  const query = useQuery();
  const token = query.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!token) {
      setError("Липсва токен за възстановяване.");
      return;
    }
    if (!password || !confirm) {
      setError("Моля, попълни и двете полета за парола.");
      return;
    }
    if (password !== confirm) {
      setError("Паролите не съвпадат.");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Паролата трябва да е поне 8 символа, с 1 главна буква и 1 цифра.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword: password
      });
      setStatus(res?.data || "Паролата е сменена успешно.");
      setPassword("");
      setConfirm("");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const validation =
        err?.response?.data?.errors &&
        Object.values(err.response.data.errors).flat().join(" ");
      setError(apiMessage || validation || err?.message || "Неуспешна смяна на паролата.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout auth-layout--single">
      <aside className="auth-panel">
        <h1>Създай нова парола.</h1>
        <p>
          Използвай минимум 8 символа, включително главна буква и цифра.
        </p>
      </aside>

      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Смяна на парола</h2>
        <p className="muted">Въведи новата парола за профила си.</p>

        {error && <p className="error-msg">{error}</p>}
        {status && <p className="success-msg">{status}</p>}

        <input
          className="input"
          type="password"
          placeholder="Нова парола"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          className="input"
          type="password"
          placeholder="Потвърди паролата"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Записване..." : "Смени паролата"}
        </button>

        <div className="auth-footer">
          <Link to="/login" className="link">Назад към вход</Link>
        </div>
      </form>
    </div>
  );
}
