import { useState } from "react";
import { Link } from "react-router-dom";
import { register } from "../api/authApi";
import "./RegisterPage.css";

export default function RegisterPage() {
  const gradeOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gradeLevel, setGradeLevel] = useState("8");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!username.trim() || !normalizedEmail || !password || !confirmPassword || !gradeLevel) {
      setError("Всички полета са задължителни.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Паролите не съвпадат.");
      return;
    }

    if (!normalizedEmail.endsWith("@schoolmath.eu")) {
      setError("Използвай училищен имейл адрес, завършващ на @schoolmath.eu.");
      return;
    }

    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: normalizedEmail,
        password,
        gradeLevel: Number(gradeLevel)
      });
      setSuccess("Регистрацията е записана. Провери пощата си в @schoolmath.eu и активирай профила, преди да влезеш.");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setGradeLevel("8");
    } catch (err) {
      setError(err?.apiMessage || err?.message || "Неуспешна регистрация.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-panel">
        <h1>Създай ученически профил.</h1>
        <p>
          Присъедини се към дискусиите, добавяй пинове и участвай в
          координацията на общността на МГ "Академик Кирил Попов" - Пловдив.
        </p>
        <ul className="auth-list">
          <li>Следи сигнали чрез карта и снимки.</li>
          <li>Отговаряй във форумни теми с вложени коментари.</li>
          <li>Подай сигнал за неподходящо съдържание.</li>
        </ul>
      </aside>

      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Регистрация за ученик</h2>
        <p className="muted">Създай профил само за минута.</p>

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        <input
          type="text"
          placeholder="Потребителско име"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="email"
          placeholder="Училищен имейл (@schoolmath.eu)"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select className="input" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
          {gradeOptions.map((grade) => (
            <option key={grade} value={grade}>
              {grade} клас
            </option>
          ))}
        </select>

        <input
          type="password"
          placeholder="Парола"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Потвърди паролата"
          className="input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Създаване..." : "Създай профил"}
        </button>

        <div className="auth-footer">
          Вече имаш профил? <Link to="/login" className="link">Вход</Link>
          <div>
            Заявка за учителски профил: <Link to="/teacher-register" className="link">Кандидатствай тук</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
