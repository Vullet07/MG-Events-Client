import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login as apiLogin } from "../api/authApi";
import api from "../api/api";
import { formatDateTime } from "../utils/formatDateTime";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "./LoginPage.css";

const authHighlights = [
  "Отбелязвай локални проблеми директно върху картата.",
  "Участвай във форумни теми с вложени отговори.",
  "Следи официални новини от учители и администратори."
];

const panelStats = [
  { label: "Форум", value: "Вложени отговори" },
  { label: "Карта", value: "Пинове и сигнали" },
  { label: "Модерация", value: "Учител/Админ" }
];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState({
    threadCount: 0,
    pinCount: 0,
    recentThreads: []
  });

  const toast = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  const bannedWarning = useMemo(
    () => searchParams.get("banned") === "1",
    [searchParams]
  );

  useEffect(() => {
    const loadSnapshot = async () => {
      try {
        const [threadsRes, pinsRes] = await Promise.all([
          api.get("/forum-threads?page=1&pageSize=4"),
          api.get("/event-pins")
        ]);

        const threads = threadsRes?.data?.items || threadsRes?.data || [];
        const pins = pinsRes?.data?.items || pinsRes?.data || [];

        setSnapshot({
          threadCount: threadsRes?.data?.totalCount || threads.length,
          pinCount: pins.length,
          recentThreads: threads.slice(0, 3)
        });
      } catch {
        setSnapshot((prev) => ({ ...prev, recentThreads: [] }));
      }
    };

    loadSnapshot();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password.trim()) {
      setError("Всички полета са задължителни.");
      return;
    }

    setLoading(true);
    try {
      const result = await apiLogin({
        identifier: identifier.trim(),
        password
      });

      const token = result?.token || result?.accessToken || result?.jwt;
      if (!token) throw new Error("Отговорът при вход не съдържа токен.");

      login(token, result?.user);
      toast?.success("Успешен вход.");
      navigate("/dashboard");
    } catch (err) {
      const message =
        err?.apiMessage ||
        err?.message ||
        "Неуспешен вход. Провери данните си.";
      setError(message);
      toast?.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout login-layout">
      <aside className="auth-panel login-panel">
        <p className="pill">МГ "Академик Кирил Попов" - Пловдив</p>
        <h1>Координирай сигнали и решения на едно място.</h1>
        <p>
          Влез, за да участваш във форума, да поставяш пинове и да следиш
          важни училищни съобщения за МГ "Академик Кирил Попов".
        </p>
        <div className="login-panel__stats">
          {panelStats.map((item) => (
            <article key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </article>
          ))}
        </div>
        <ul className="auth-list">
          {authHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </aside>

      <form className="auth-card login-card" onSubmit={handleSubmit}>
        <h2>Вход</h2>
        <p className="muted">Използвай потребителско име или имейл.</p>

        {bannedWarning && (
          <p className="error-msg">
            Профилът ти е блокиран. Свържи се с администратор.
          </p>
        )}
        {error && <p className="error-msg">{error}</p>}

        <input
          className="input"
          placeholder="Потребителско име или имейл"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <input
          className="input"
          type="password"
          placeholder="Парола"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Влизане..." : "Влез"}
        </button>

        <div className="auth-footer login-card__links">
          <Link to="/forgot-password" className="login-inline-link">
            Забравена парола
          </Link>
          <Link to="/register" className="login-inline-link">
            Регистрация за ученик
          </Link>
          <Link to="/teacher-register" className="login-inline-link">
            Заявка за учител
          </Link>
        </div>

        <section className="login-snapshot">
          <div className="login-snapshot__head">
            <strong>Актуална картина на общността</strong>
            <span className="pill">{snapshot.threadCount} теми - {snapshot.pinCount} пина</span>
          </div>

          {snapshot.recentThreads.length === 0 ? (
            <p className="muted">Няма наличен публичен преглед на темите.</p>
          ) : (
            <div className="login-snapshot__list">
              {snapshot.recentThreads.map((thread) => (
                <article key={thread.id} className="login-snapshot__item">
                  <strong>{thread.title}</strong>
                  <span className="muted">{formatDateTime(thread.lastPostAt || thread.createdAt)}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      </form>
    </div>
  );
}
