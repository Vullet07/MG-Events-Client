import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerTeacherRequest } from "../api/authApi";
import "./RegisterPage.css";

export default function TeacherRegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [motivation, setMotivation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Всички задължителни полета трябва да са попълнени.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Паролите не съвпадат.");
      return;
    }

    setLoading(true);
    try {
      await registerTeacherRequest({
        username: username.trim(),
        email: email.trim(),
        password,
        motivation: motivation.trim()
      });
      setSuccess("Заявката е изпратена. Необходимо е одобрение от администратор.");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err?.apiMessage || err?.message || "Неуспешно изпращане на заявка.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-panel">
        <h1>Заявка за учителски достъп.</h1>
        <p>
          Учителските профили се преглеждат от администратор, за да се защитят
          инструментите за модерация и официални съобщения.
        </p>
        <ul className="auth-list">
          <li>Управление на модерацията за ученици.</li>
          <li>Публикуване на официални новини и събития.</li>
          <li>Подкрепа при преглед на сигнали и безопасност.</li>
        </ul>
      </aside>

      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Заявка за регистрация на учител</h2>
        <p className="muted">Попълни формата и изчакай одобрение.</p>

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        <input className="input" placeholder="Потребителско име" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="input" placeholder="Имейл" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" placeholder="Парола" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className="input" placeholder="Потвърди паролата" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

        <textarea
          className="textarea"
          placeholder="Опиши защо ти е необходим учителски достъп (по желание)"
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
        />

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Изпращане..." : "Изпрати заявка"}
        </button>

        <div className="auth-footer">
          Назад към <Link to="/login" className="link">Вход</Link>
        </div>
      </form>
    </div>
  );
}
