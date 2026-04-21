import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmEmail } from "../api/authApi";
import "./RegisterPage.css";

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = searchParams.get("token") || "";
    const kind = searchParams.get("kind") || "";

    if (!token || !kind) {
      setError("Линкът за потвърждение е невалиден.");
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const message = await confirmEmail({ token, kind });
        setSuccess(message || "Имейлът е потвърден успешно.");
      } catch (err) {
        setError(err?.apiMessage || err?.message || "Неуспешно потвърждение на имейла.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [searchParams]);

  return (
    <div className="auth-layout">
      <aside className="auth-panel">
        <h1>Потвърждение на профил</h1>
        <p>
          Завършваме активацията на профила ти за MG Events в МГ "Академик Кирил Попов" - Пловдив.
        </p>
        <ul className="auth-list">
          <li>След успешна активация можеш да влезеш в платформата.</li>
          <li>Учителските заявки остават в изчакване за администраторско одобрение.</li>
          <li>Използвай служебен имейл с домейн `@schoolmath.eu`.</li>
        </ul>
      </aside>

      <section className="auth-card">
        <h2>Активация на имейл</h2>
        <p className="muted">Изчакваме потвърждението от сървъра.</p>

        {loading && <p className="muted">Потвърждаваме имейла...</p>}
        {!loading && error && <p className="error-msg">{error}</p>}
        {!loading && success && <p className="success-msg">{success}</p>}

        <div className="auth-footer">
          <Link to="/login" className="link">
            Към вход
          </Link>
        </div>
      </section>
    </div>
  );
}
