import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "./CreateThreadPage.css";

const TITLE_SUGGESTIONS = [
  "Счупено осветление в коридора на втория етаж",
  "Хлъзгава настилка пред голямата сграда",
  "Проблем с отоплението в кабинет 214",
  "Шум и струпване пред столовата в голямото междучасие"
];

export default function CreateThreadPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const canPublishNews = user?.role === "Admin" || user?.role === "Teacher";

  useEffect(() => {
    const prefilledTitle = searchParams.get("title");
    if (prefilledTitle) {
      setTitle(prefilledTitle);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Заглавието е задължително.");
      return;
    }

    if (/^\s*\[news\]\b/i.test(title) && !canPublishNews) {
      setError("Само учители и администратори могат да публикуват новини.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/forum-threads", { title: title.trim() });
      toast?.success("Темата е създадена успешно.");
      navigate(`/threads/${res.data.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно създаване на тема.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell create-thread-page">
      <section className="card card-pad create-thread-hero">
        <div className="create-thread-hero__copy">
          <p className="create-thread-eyebrow">Форум • MG Events</p>
          <h2 className="section-title">Създай тема, която другите ще разберат от пръв поглед</h2>
          <p className="section-subtitle">
            Добре формулираното заглавие помага на ученици, учители и администратори в
            МГ &quot;Академик Кирил Попов&quot; по-бързо да открият проблема и да се включат в дискусията.
          </p>

          <div className="create-thread-hero__chips">
            <span className="pill">Кратко и конкретно</span>
            <span className="pill">Лесно за търсене</span>
            <span className="pill">Подходящо за форум и сигнали</span>
          </div>
        </div>

        <div className="create-thread-hero__tips">
          <article>
            <strong>Какво работи добре</strong>
            <p>Използвай място, проблем и контекст в едно заглавие.</p>
          </article>
          <article>
            <strong>Примерен формат</strong>
            <p>Проблем + локация + кратка последица.</p>
          </article>
          <article>
            <strong>Подсказка</strong>
            <p>Ако темата е по сигнал от картата, можеш да я стартираш и само с едно ясно заглавие.</p>
          </article>
        </div>
      </section>

      <section className="card card-pad create-thread-card">
        <div className="split-row create-thread-card__header">
          <div>
            <h3>Нова тема</h3>
            <p className="muted">В момента за темата е нужно само заглавие.</p>
          </div>
          <span className="pill">{title.trim().length} символа</span>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleSubmit} className="form-grid create-thread-form">
          <label className="create-thread-field">
            <span>Заглавие на темата</span>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Пример: Опасна пешеходна пътека до училището"
            />
          </label>

          <div className="create-thread-suggestions">
            <span>Бързи идеи:</span>
            <div className="create-thread-suggestions__list">
              {TITLE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setTitle(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {!canPublishNews && (
            <div className="create-thread-note">
              Ако започнеш заглавието с `[News]`, темата ще се третира като новина, а това е достъпно само за учители и администратори.
            </div>
          )}

          <div className="create-thread-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Създаване..." : "Създай тема"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
